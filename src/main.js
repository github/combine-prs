import * as core from '@actions/core'
import * as github from '@actions/github'
import {context} from '@actions/github'

export async function run() {
  // Get configuration inputs
  const branchPrefix = core.getInput('branch_prefix')
  const mustBeGreen = core.getInput('ci_required') === 'true'
  const combineBranchName = core.getInput('combine_branch_name')
  const ignoreLabel = core.getInput('ignore_label')

  // Get all open pull requests in the repository
  const pulls = await github.paginate('GET /repos/:owner/:repo/pulls', {
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
    if (branch.startsWith(branchPrefix)) {
      core.info('Branch matched prefix: ' + branch)
      let statusOK = true

      // Check CI status if required
      if (mustBeGreen) {
        core.info('Checking green status: ' + branch)
        const stateQuery = `query($owner: String!, $repo: String!, $pull_number: Int!) {
                    repository(owner: $owner, name: $repo) {
                      pullRequest(number:$pull_number) {
                        commits(last: 1) {
                          nodes {
                            commit {
                              statusCheckRollup {
                                state
                              }
                            }
                          }
                        }
                      }
                    }
                  }`
        const vars = {
          owner: context.repo.owner,
          repo: context.repo.repo,
          pull_number: pull['number']
        }
        const result = await github.graphql(stateQuery, vars)
        const [{commit}] = result.repository.pullRequest.commits.nodes
        const state = commit.statusCheckRollup.state
        core.info('Validating status: ' + state)
        if (state != 'SUCCESS') {
          core.info('Discarding ' + branch + ' with status ' + state)
          statusOK = false
        }
      }

      // Check for ignore label
      core.info('Checking labels: ' + branch)
      const labels = pull['labels']
      for (const label of labels) {
        const labelName = label['name']
        core.info('Checking label: ' + labelName)
        if (labelName == ignoreLabel) {
          core.info('Discarding ' + branch + ' with label ' + labelName)
          statusOK = false
        }
      }
      if (statusOK) {
        core.info('Adding branch to array: ' + branch)
        const prString = '#' + pull['number'] + ' ' + pull['title']
        branchesAndPRStrings.push({branch, prString})
        baseBranch = pull['base']['ref']
        baseBranchSHA = pull['base']['sha']
      }
    }
  }
  if (branchesAndPRStrings.length == 0) {
    core.setFailed('No PRs/branches matched criteria')
    return
  }

  // Create a new branch
  try {
    await github.rest.git.createRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: 'refs/heads/' + combineBranchName,
      sha: baseBranchSHA
    })
  } catch (error) {
    core.error(error)
    core.setFailed(
      'Failed to create combined branch - maybe a branch by that name already exists?'
    )
    return
  }

  // Merge all branches into the new branch
  let combinedPRs = []
  let mergeFailedPRs = []
  for (const {branch, prString} of branchesAndPRStrings) {
    try {
      await github.rest.repos.merge({
        owner: context.repo.owner,
        repo: context.repo.repo,
        base: combineBranchName,
        head: branch
      })
      core.info('Merged branch ' + branch)
      combinedPRs.push(prString)
    } catch (error) {
      core.warn('Failed to merge branch ' + branch)
      mergeFailedPRs.push(prString)
    }
  }

  // Create a new PR with the combined branch
  core.info('Creating combined PR')
  const combinedPRsString = combinedPRs.join('\n')
  let body =
    '✅ This PR was created by the Combine PRs action by combining the following PRs:\n' +
    combinedPRsString
  if (mergeFailedPRs.length > 0) {
    const mergeFailedPRsString = mergeFailedPRs.join('\n')
    body +=
      '\n\n⚠️ The following PRs were left out due to merge conflicts:\n' +
      mergeFailedPRsString
  }
  const pullRequest = await github.rest.pulls.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    title: 'Combined PR',
    head: combineBranchName,
    base: baseBranch,
    body: body
  })

  // print pull request url
  core.info('Combined PR created: ' + pullRequest.data.html_url)
  core.setOutput('pr_url', pullRequest.data.html_url)
}

run()
