import * as core from '@actions/core'
import {context} from '@actions/github'

export async function checkStatus(
  pull,
  branch,
  octokit,
  mustBeGreen,
  mustBeApproved
) {
  let statusOK = true
  if (mustBeGreen || mustBeApproved) {
    core.info('Checking green status: ' + branch)
    const stateQuery = `query($owner: String!, $repo: String!, $pull_number: Int!) {
                    repository(owner: $owner, name: $repo) {
                      pullRequest(number:$pull_number) {
                        reviewDecision
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
    const result = await octokit.graphql(stateQuery, vars)

    // Check for CI status
    if (mustBeGreen) {
      const [{commit}] = result.repository.pullRequest.commits.nodes
      if (commit.statusCheckRollup) {
        const state = commit.statusCheckRollup.state
        core.info('Validating status: ' + state)
        if (state !== 'SUCCESS') {
          core.info('Discarding ' + branch + ' with status ' + state)
          statusOK = false
        }
      } else {
        core.info('No status check associated with branch: ' + branch)
        statusOK = false
      }
    }

    // Check for review approval
    if (mustBeApproved) {
      const reviewDecision = result.repository.pullRequest.reviewDecision
      core.info('Validating review decision: ' + reviewDecision)
      if (reviewDecision === 'APPROVED') {
        core.info('Branch ' + branch + ' is approved')
      } else if (reviewDecision === null) {
        // In this case, reviewDecision will be null if no reviews are required
        core.info('Branch ' + branch + ' has no required reviewers - OK')
      } else {
        core.info(
          'Discarding ' + branch + ' with review decision ' + reviewDecision
        )
        statusOK = false
      }
    }
  }
  return statusOK
}
