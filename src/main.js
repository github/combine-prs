import * as core from '@actions/core'
import * as github from '@actions/github'
import {context} from '@actions/github'
import {checkLabels} from './functions/check-labels'
import {checkStatus} from './functions/check-status'

const repoName = 'github/combine-prs'
const repoUrl = 'https://github.com/github/combine-prs'

export async function run() {
  // Get configuration inputs
  const branchPrefix = core.getInput('branch_prefix')
  const branchRegex = core.getInput('branch_regex')
  const mustBeGreen = core.getInput('ci_required') === 'true'
  const mustBeApproved = core.getInput('review_required') === 'true'
  const combineBranchName = core.getInput('combine_branch_name')
  const ignoreLabel = core.getInput('ignore_label')
  const selectLabel = core.getInput('select_label')
  const labels = core.getInput('labels').trim()
  const token = core.getInput('github_token', {required: true})
  const prTitle = core.getInput('pr_title', {required: true})
  const prBodyHeader = core.getInput('pr_body_header', {required: true})
  const minCombineNumber = parseInt(
    core.getInput('min_combine_number', {required: true})
  )

  // check for either prefix or regex
  if (branchPrefix === '' && branchRegex === '') {
    core.setFailed('Must specify either branch_prefix or branch_regex')
    return 'Must specify either branch_prefix or branch_regex'
  }

  // check valid label config
  if (ignoreLabel && selectLabel && ignoreLabel == selectLabel) {
    core.setFailed('ignore_label and select_label cannot have the same value')
    return 'ignore_label and select_label cannot have the same value'
  }

  // Create a octokit GitHub client
  const octokit = github.getOctokit(token)

  // Get all open pull requests in the repository
  const pulls = await octokit.paginate('GET /repos/:owner/:repo/pulls', {
    owner: context.repo.owner,
    repo: context.repo.repo
  })

  // Filter the pull requests by branch prefix and CI status
  let branchesAndPRStrings = []
  let baseBranch = null
  let baseBranchSHA = null
  for (const pull of pulls) {
    const branch = pull['head']['ref']
    core.info('Pull for branch: ' + branch)

    // Check branch with branch_regex
    if (branchRegex !== '') {
      const regex = new RegExp(branchRegex)
      if (regex.test(branch)) {
        core.info('Branch matched regex: ' + branch)
      } else {
        core.info('Branch did not match regex: ' + branch)
        continue
      }
    } else {
      // If no regex, check branch with branch_prefix
      if (branch.startsWith(branchPrefix)) {
        core.info('Branch matched prefix: ' + branch)
      } else {
        continue
      }
    }

    // Check labels
    let statusOK = await checkLabels(pull, branch, selectLabel, ignoreLabel)

    // Check CI status or review status if required
    statusOK =
      statusOK &&
      (await checkStatus(pull, branch, octokit, mustBeGreen, mustBeApproved))

    if (statusOK) {
      core.info('Adding branch to array: ' + branch)
      const prString = 'Closes #' + pull['number'] + ' ' + pull['title']
      branchesAndPRStrings.push({branch, prString})
      baseBranch = pull['base']['ref']
      baseBranchSHA = pull['base']['sha']
    }
  }

  // If no branches match, exit
  if (branchesAndPRStrings.length === 0) {
    core.info('No PRs/branches matched criteria')
    return 'No PRs/branches matched criteria'
  }

  // If not enough branches match given min_combine_number, exit
  if (branchesAndPRStrings.length < minCombineNumber) {
    core.info(
      `Not enough PRs/branches matched criteria to create a combined PR - matched ${branchesAndPRStrings.length} branches/PRs but need ${minCombineNumber} branches/PRs`
    )
    return 'not enough PRs/branches matched criteria to create a combined PR'
  }

  // Create a new branch
  try {
    await octokit.rest.git.createRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: 'refs/heads/' + combineBranchName,
      sha: baseBranchSHA
    })
  } catch (error) {
    // If the branch already exists, we'll try to merge into it
    if (error.status == 422) {
      core.warning('Branch already exists - will try to merge into it')
    } else {
      // Otherwise, fail the Action
      core.error(error)
      core.setFailed('Failed to create combined branch')
      return 'Failed to create combined branch'
    }
  }

  // Merge all branches into the new branch
  let combinedPRs = []
  let mergeFailedPRs = []
  for (const {branch, prString} of branchesAndPRStrings) {
    try {
      await octokit.rest.repos.merge({
        owner: context.repo.owner,
        repo: context.repo.repo,
        base: combineBranchName,
        head: branch
      })
      core.info('Merged branch ' + branch)
      combinedPRs.push(prString)
    } catch (error) {
      core.warning('Failed to merge branch ' + branch)
      mergeFailedPRs.push(prString.replace('Closes ', ''))
    }
  }

  // Create a new PR with the combined branch
  core.info('Creating combined PR')
  const combinedPRsString = `- ${combinedPRs.join('\n- ')}`
  let body = `${prBodyHeader}\n\n✅ The following pull requests have been successfully combined on this PR:\n${combinedPRsString}`
  if (mergeFailedPRs.length > 0) {
    const mergeFailedPRsString = `- ${mergeFailedPRs.join('\n- ')}`
    body +=
      '\n\n⚠️ The following PRs were left out due to merge conflicts:\n' +
      mergeFailedPRsString
  }

  body += `\n\n> This PR was created by the [\`${repoName}\`](${repoUrl}) action`

  core.debug('PR body: ' + body)

  var pullRequest
  try {
    pullRequest = await octokit.rest.pulls.create({
      owner: context.repo.owner,
      repo: context.repo.repo,
      title: prTitle,
      head: combineBranchName,
      base: baseBranch,
      body: body
    })
  } catch (error) {
    if (error?.status === 422) {
      core.warning('Combined PR already exists')
      // update the PR body
      const prs = await octokit.rest.pulls.list({
        owner: context.repo.owner,
        repo: context.repo.repo,
        head: context.repo.owner + ':' + combineBranchName,
        base: baseBranch,
        state: 'open'
      })
      const pr = prs.data[0]
      core.info('Updating PR body')
      await octokit.rest.pulls.update({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: pr.number,
        body: body
      })
      pullRequest = {data: pr}
    } else {
      if (
        error?.message?.includes(
          'GitHub Actions is not permitted to create or approve pull requests'
        )
      ) {
        core.warning(
          'https://github.blog/changelog/2022-05-03-github-actions-prevent-github-actions-from-creating-and-approving-pull-requests/'
        )
      }

      core.setFailed(`Failed to create combined PR - ${error}`)
      return 'failure'
    }
  }

  // check the combined PR's state to see if it is closed
  const combinedPRState = pullRequest.data.state
  if (combinedPRState === 'closed') {
    core.info('Combined PR is closed - attempting to reopen')
    await octokit.rest.pulls.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: pullRequest.data.number,
      state: 'open'
    })
  }

  if (labels !== '') {
    // split and trim labels
    const labelsArray = labels.split(',').map(label => label.trim())

    // add labels to the combined PR if specified
    if (labelsArray.length > 0) {
      core.info(`Adding labels to combined PR: ${labelsArray}`)
      await octokit.rest.issues.addLabels({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: pullRequest.data.number,
        labels: labelsArray
      })
    }
  }

  // output pull request url
  core.info('Combined PR url: ' + pullRequest.data.html_url)
  core.setOutput('pr_url', pullRequest.data.html_url)

  // output pull request number
  core.info('Combined PR number: ' + pullRequest.data.number)
  core.setOutput('pr_number', pullRequest.data.number)

  return 'success'
}

// Do not run if this is a test
if (process.env.COMBINE_PRS_TEST !== 'true') {
  /* istanbul ignore next */
  run()
}
