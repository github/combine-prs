import {run} from '../src/main'
import * as github from '@actions/github'
import * as core from '@actions/core'

const setOutputMock = jest.spyOn(core, 'setOutput')
const infoMock = jest.spyOn(core, 'info')
const warningMock = jest.spyOn(core, 'warning')
const setFailedMock = jest.spyOn(core, 'setFailed')
const debugMock = jest.spyOn(core, 'debug')

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
          },
          {
            number: 4,
            title: 'Update dependency 4',
            head: {
              ref: 'dependabot-4'
            },
            base: {
              ref: 'main'
            },
            labels: []
          }
        ]
      }),
      graphql: jest
        .fn()
        .mockImplementationOnce(() => {
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
        })
        .mockImplementationOnce(() => {
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
        })
        .mockImplementationOnce(() => {
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
        })
        .mockImplementationOnce(() => {
          return {
            repository: {
              pullRequest: {
                commits: {
                  nodes: [
                    {
                      commit: {
                        statusCheckRollup: {
                          state: 'FAILURE'
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
          })
        },
        repos: {
          // mock the first value of merge to be a success and the second to be an exception
          merge: jest
            .fn()
            .mockReturnValueOnce({
              data: {
                merged: true
              }
            })
            .mockImplementationOnce(() => {
              throw new Error('merge error')
            })
        },
        pulls: {
          create: jest.fn().mockReturnValueOnce({
            data: {
              number: 100,
              html_url: 'https://github.com/test-owner/test-repo/pull/100'
            }
          })
        }
      }
    }
  })
})

test('successfully runs the action', async () => {
  expect(await run()).toBe('success')
  expect(infoMock).toHaveBeenCalledWith('Pull for branch: dependabot-1')
  expect(infoMock).toHaveBeenCalledWith('Branch matched prefix: dependabot-1')
  expect(infoMock).toHaveBeenCalledWith('Checking green status: dependabot-1')
  expect(infoMock).toHaveBeenCalledWith('Validating status: SUCCESS')
  expect(infoMock).toHaveBeenCalledWith('Pull for branch: dependabot-2')
  expect(infoMock).toHaveBeenCalledWith('Branch matched prefix: dependabot-2')
  expect(infoMock).toHaveBeenCalledWith('Checking green status: dependabot-2')
  expect(infoMock).toHaveBeenCalledWith('Validating status: SUCCESS')
  expect(infoMock).toHaveBeenCalledWith('Pull for branch: dependabot-3')
  expect(infoMock).toHaveBeenCalledWith('Branch matched prefix: dependabot-3')
  expect(infoMock).toHaveBeenCalledWith('Checking green status: dependabot-3')
  expect(infoMock).toHaveBeenCalledWith('Validating status: SUCCESS')
  expect(infoMock).toHaveBeenCalledWith('Pull for branch: dependabot-4')
  expect(infoMock).toHaveBeenCalledWith('Branch matched prefix: dependabot-4')
  expect(infoMock).toHaveBeenCalledWith('Checking green status: dependabot-4')
  expect(infoMock).toHaveBeenCalledWith('Validating status: FAILURE')
  expect(infoMock).toHaveBeenCalledWith(
    'Discarding dependabot-4 with status FAILURE'
  )
  expect(infoMock).toHaveBeenCalledWith('Checking labels: dependabot-1')
  expect(infoMock).toHaveBeenCalledWith('Checking label: question')
  expect(infoMock).toHaveBeenCalledWith('Adding branch to array: dependabot-1')
  expect(infoMock).toHaveBeenCalledWith('Checking labels: dependabot-2')
  expect(infoMock).toHaveBeenCalledWith('Adding branch to array: dependabot-2')
  expect(infoMock).toHaveBeenCalledWith('Checking labels: dependabot-3')
  expect(infoMock).toHaveBeenCalledWith('Checking label: nocombine')
  expect(infoMock).toHaveBeenCalledWith(
    'Discarding dependabot-3 with label nocombine'
  )
  expect(infoMock).toHaveBeenCalledWith('Merged branch dependabot-1')
  expect(warningMock).toHaveBeenCalledWith(
    'Failed to merge branch dependabot-2'
  )
  expect(infoMock).toHaveBeenCalledWith('Creating combined PR')
  expect(debugMock).toHaveBeenCalledWith(
    'PR body: ✅ This PR was created by the Combine PRs action by combining the following PRs:\n#1 Update dependency 1\n\n⚠️ The following PRs were left out due to merge conflicts:\n#2 Update dependency 2'
  )
  expect(infoMock).toHaveBeenCalledWith(
    'Combined PR created: https://github.com/test-owner/test-repo/pull/100'
  )
  expect(infoMock).toHaveBeenCalledWith('Combined PR number: 100')
  expect(setOutputMock).toHaveBeenCalledWith('pr_number', 100)
  expect(setOutputMock).toHaveBeenCalledWith(
    'pr_url',
    'https://github.com/test-owner/test-repo/pull/100'
  )
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
  expect(setFailedMock).toHaveBeenCalledWith('Failed to create combined branch - maybe a branch by that name already exists?')
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
