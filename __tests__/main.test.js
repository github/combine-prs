import { run } from '../src/main'
import * as github from '@actions/github'
import * as core from '@actions/core'

// const setOutputMock = jest.spyOn(core, 'setOutput')
// const saveStateMock = jest.spyOn(core, 'saveState')
// const setFailedMock = jest.spyOn(core, 'setFailed')
// const debugMock = jest.spyOn(core, 'debug')

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(core, 'setOutput').mockImplementation(() => { })
  jest.spyOn(core, 'setFailed').mockImplementation(() => { })
  jest.spyOn(core, 'saveState').mockImplementation(() => { })
  jest.spyOn(core, 'info').mockImplementation(() => { })
  jest.spyOn(core, 'debug').mockImplementation(() => { })
  jest.spyOn(core, 'warning').mockImplementation(() => { })
  jest.spyOn(core, 'error').mockImplementation(() => { })
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
            title: 'Update dependency 1',
            head: {
              ref: 'dependabot-1'
            },
            base: {
              ref: 'main'
            },
            labels: [
              {
                name: 'question'
              }
            ]
          },
          {
            number: 2,
            title: 'Update dependency 2',
            head: {
              ref: 'dependabot-2'
            },
            base: {
              ref: 'main'
            },
            labels: []
          },
          {
            number: 3,
            title: 'Update dependency 3',
            head: {
              ref: 'dependabot-3'
            },
            base: {
              ref: 'main'
            },
            labels: [
              {
                name: 'nocombine'
              }
            ]
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
        git: {
          createRef: jest.fn().mockReturnValueOnce({
            data: {}
          }),
        },
        repos: {
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

test('successfully runs the action', async () => {
  expect(await run()).toBe('success')
})

test('runs the action and fails to create the combine branch', async () => {
  jest.spyOn(github, 'getOctokit').mockImplementation(() => {
    return {
      paginate: jest.fn().mockImplementation(() => {
        return [
          {
            number: 1,
            title: 'Update dependency 1',
            head: {
              ref: 'dependabot-1'
            },
            base: {
              ref: 'main'
            },
            labels: [
              {
                name: 'question'
              }
            ]
          },
          {
            number: 2,
            title: 'Update dependency 2',
            head: {
              ref: 'dependabot-2'
            },
            base: {
              ref: 'main'
            },
            labels: []
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

  expect(await run()).toBe('Failed to create combined branch')
})

test('runs the action and does not find any branches to merge together', async () => {
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

  expect(await run()).toBe('No PRs/branches matched criteria')
})
