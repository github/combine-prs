import {run} from '../src/main'
import * as github from '@actions/github'
import * as core from '@actions/core'

// const setOutputMock = jest.spyOn(core, 'setOutput')
// const saveStateMock = jest.spyOn(core, 'saveState')
// const setFailedMock = jest.spyOn(core, 'setFailed')
// const debugMock = jest.spyOn(core, 'debug')

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(core, 'setOutput').mockImplementation(() => {})
  jest.spyOn(core, 'setFailed').mockImplementation(() => {})
  jest.spyOn(core, 'saveState').mockImplementation(() => {})
  jest.spyOn(core, 'info').mockImplementation(() => {})
  jest.spyOn(core, 'debug').mockImplementation(() => {})
  jest.spyOn(core, 'warning').mockImplementation(() => {})
  jest.spyOn(core, 'error').mockImplementation(() => {})
  process.env.INPUT_GITHUB_TOKEN = 'faketoken'
  process.env.INPUT_CI_REQUIRED = 'true'
  process.env.INPUT_COMBINE_BRANCH_NAME = 'combined-prs-branch'
  process.env.INPUT_BRANCH_PREFIX = 'dependabot'
  process.env.INPUT_IGNORE_LABEL = 'nocombine'
  process.env.GITHUB_REPOSITORY = 'test-owner/test-repo'

  jest.spyOn(github, 'getOctokit').mockImplementation(() => {
    return {
      paginate: jest.fn().mockImplementation(() => {
        return [
          {
            number: 1,
            head: {
              ref: 'test-ref'
            }
          }
        ]
      }),
      graphql: jest.fn().mockImplementation(() => {
        return {
          repository: {
            pullRequest: {
              commits: {
                nodes: [
                  {
                    commit: {
                      statusCheckRollup: {
                        state: 'SUCCESS'
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }),
      rest: {
        issues: {
          createComment: jest.fn().mockReturnValueOnce({
            data: {}
          })
        },
        repos: {
          createRef: jest.fn().mockReturnValueOnce({
            data: {}
          }),
          merge: jest.fn().mockReturnValueOnce({
            data: {}
          })
        },
        pulls: {
          create: jest.fn().mockReturnValueOnce({
            data: {}
          })
        }
      }
    }
  })
})

test('runs the action and does not find any branches to merge together', async () => {
  expect(await run()).toBe('No PRs/branches matched criteria')
})
