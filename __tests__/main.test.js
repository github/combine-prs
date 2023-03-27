import {run} from '../src/main'
import * as github from '@actions/github'
import * as core from '@actions/core'

class BigBadError extends Error {
  constructor(message) {
    super(message)
    this.status = 500
  }
}

class AlreadyExistsError extends Error {
  constructor(message) {
    super(message)
    this.status = 422
  }
}

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
  process.env.INPUT_PR_TITLE = 'Combined PRs'
  process.env.INPUT_PR_BODY_HEADER = '# Combined PRs ➡️📦⬅️'
  process.env.INPUT_REVIEW_REQUIRED = 'false'
  process.env.INPUT_COMBINE_BRANCH_NAME = 'combined-prs-branch'
  process.env.INPUT_BRANCH_PREFIX = 'dependabot'
  process.env.INPUT_IGNORE_LABEL = 'nocombine'
  process.env.INPUT_SELECT_LABEL = ''
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
          },
          {
            number: 5,
            title: 'Update dependency 5',
            head: {
              ref: 'dependabot-5'
            },
            base: {
              ref: 'main'
            },
            labels: []
          },
          {
            number: 6,
            title: 'Update dependency 6',
            head: {
              ref: 'dependabot-6'
            },
            base: {
              ref: 'main'
            },
            labels: []
          },
          {
            number: 7,
            title: 'Update dependency 7',
            head: {
              ref: 'fix-package'
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
                reviewDecision: 'APPROVED',
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
                reviewDecision: 'APPROVED',
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
                reviewDecision: 'APPROVED',
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
                reviewDecision: 'APPROVED',
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
        })
        .mockImplementationOnce(() => {
          return {
            repository: {
              pullRequest: {
                reviewDecision: null,
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
                reviewDecision: 'REVIEW_REQUIRED',
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
  process.env.INPUT_REVIEW_REQUIRED = 'true'
  expect(await run()).toBe('success')
  expect(infoMock).toHaveBeenCalledWith('Pull for branch: dependabot-1')
  expect(infoMock).toHaveBeenCalledWith('Branch matched prefix: dependabot-1')
  expect(infoMock).toHaveBeenCalledWith('Checking green status: dependabot-1')
  expect(infoMock).toHaveBeenCalledWith('Validating status: SUCCESS')
  expect(infoMock).toHaveBeenCalledWith('Validating review decision: APPROVED')
  expect(infoMock).toHaveBeenCalledWith('Branch dependabot-1 is approved')
  expect(infoMock).toHaveBeenCalledWith('Pull for branch: dependabot-2')
  expect(infoMock).toHaveBeenCalledWith('Branch matched prefix: dependabot-2')
  expect(infoMock).toHaveBeenCalledWith('Checking green status: dependabot-2')
  expect(infoMock).toHaveBeenCalledWith('Validating status: SUCCESS')
  expect(infoMock).toHaveBeenCalledWith('Validating review decision: APPROVED')
  expect(infoMock).toHaveBeenCalledWith('Branch dependabot-2 is approved')
  expect(infoMock).toHaveBeenCalledWith('Pull for branch: dependabot-3')
  expect(infoMock).toHaveBeenCalledWith('Branch matched prefix: dependabot-3')
  expect(infoMock).toHaveBeenCalledWith('Checking green status: dependabot-3')
  expect(infoMock).toHaveBeenCalledWith('Validating status: SUCCESS')
  expect(infoMock).toHaveBeenCalledWith('Validating review decision: APPROVED')
  expect(infoMock).toHaveBeenCalledWith('Branch dependabot-3 is approved')
  expect(infoMock).toHaveBeenCalledWith('Pull for branch: dependabot-4')
  expect(infoMock).toHaveBeenCalledWith('Branch matched prefix: dependabot-4')
  expect(infoMock).toHaveBeenCalledWith('Checking green status: dependabot-4')
  expect(infoMock).toHaveBeenCalledWith('Validating status: FAILURE')
  expect(infoMock).toHaveBeenCalledWith(
    'Discarding dependabot-4 with status FAILURE'
  )
  expect(infoMock).toHaveBeenCalledWith('Branch matched prefix: dependabot-5')
  expect(infoMock).toHaveBeenCalledWith('Checking green status: dependabot-5')
  expect(infoMock).toHaveBeenCalledWith('Validating status: SUCCESS')
  expect(infoMock).toHaveBeenCalledWith('Validating review decision: null')
  expect(infoMock).toHaveBeenCalledWith(
    'Branch dependabot-5 has no required reviewers - OK'
  )
  expect(infoMock).toHaveBeenCalledWith('Checking labels: dependabot-1')
  expect(infoMock).toHaveBeenCalledWith('Checking ignore_label for: question')
  expect(infoMock).toHaveBeenCalledWith('Adding branch to array: dependabot-1')
  expect(infoMock).toHaveBeenCalledWith('Checking labels: dependabot-2')
  expect(infoMock).toHaveBeenCalledWith('Adding branch to array: dependabot-2')
  expect(infoMock).toHaveBeenCalledWith('Checking labels: dependabot-3')
  expect(infoMock).toHaveBeenCalledWith('Checking ignore_label for: nocombine')
  expect(infoMock).toHaveBeenCalledWith(
    'Discarding dependabot-3 with label nocombine because it matches ignore_label'
  )
  expect(infoMock).toHaveBeenCalledWith('Checking labels: dependabot-4')
  expect(infoMock).toHaveBeenCalledWith('Checking labels: dependabot-5')
  expect(infoMock).toHaveBeenCalledWith('Checking labels: dependabot-6')
  expect(infoMock).toHaveBeenCalledWith('Merged branch dependabot-1')
  expect(warningMock).toHaveBeenCalledWith(
    'Failed to merge branch dependabot-2'
  )
  expect(infoMock).toHaveBeenCalledWith('Merged branch dependabot-5')
  expect(infoMock).toHaveBeenCalledWith('Creating combined PR')
  expect(debugMock).toHaveBeenCalledWith(
    'PR body: # Combined PRs ➡️📦⬅️\n\n✅ The following pull requests have been successfully combined on this PR:\n- #1 Update dependency 1\n- #5 Update dependency 5\n\n⚠️ The following PRs were left out due to merge conflicts:\n- #2 Update dependency 2\n\n> This PR was created by the [`github/combine-prs`](https://github.com/github/combine-prs) action'
  )
  expect(infoMock).toHaveBeenCalledWith(
    'Combined PR url: https://github.com/test-owner/test-repo/pull/100'
  )
  expect(infoMock).toHaveBeenCalledWith('Combined PR number: 100')
  expect(setOutputMock).toHaveBeenCalledWith('pr_number', 100)
  expect(setOutputMock).toHaveBeenCalledWith(
    'pr_url',
    'https://github.com/test-owner/test-repo/pull/100'
  )
})

test('successfully runs the action with the branch_regex option', async () => {
  process.env.INPUT_REVIEW_REQUIRED = 'true'
  process.env.INPUT_BRANCH_REGEX = '.*penda.*' // match dependabot branches
  expect(await run()).toBe('success')
  expect(infoMock).toHaveBeenCalledWith('Pull for branch: dependabot-1')
  expect(infoMock).toHaveBeenCalledWith('Branch matched regex: dependabot-1')
  expect(infoMock).toHaveBeenCalledWith('Checking green status: dependabot-1')
  expect(infoMock).toHaveBeenCalledWith('Validating status: SUCCESS')
  expect(infoMock).toHaveBeenCalledWith('Validating review decision: APPROVED')
  expect(infoMock).toHaveBeenCalledWith('Branch dependabot-1 is approved')
  expect(infoMock).toHaveBeenCalledWith('Pull for branch: dependabot-2')
  expect(infoMock).toHaveBeenCalledWith('Branch matched regex: dependabot-2')
  expect(infoMock).toHaveBeenCalledWith('Checking green status: dependabot-2')
  expect(infoMock).toHaveBeenCalledWith('Validating status: SUCCESS')
  expect(infoMock).toHaveBeenCalledWith('Validating review decision: APPROVED')
  expect(infoMock).toHaveBeenCalledWith('Branch dependabot-2 is approved')
  expect(infoMock).toHaveBeenCalledWith('Pull for branch: dependabot-3')
  expect(infoMock).toHaveBeenCalledWith('Branch matched regex: dependabot-3')
  expect(infoMock).toHaveBeenCalledWith('Checking green status: dependabot-3')
  expect(infoMock).toHaveBeenCalledWith('Validating status: SUCCESS')
  expect(infoMock).toHaveBeenCalledWith('Validating review decision: APPROVED')
  expect(infoMock).toHaveBeenCalledWith('Branch dependabot-3 is approved')
  expect(infoMock).toHaveBeenCalledWith('Pull for branch: dependabot-4')
  expect(infoMock).toHaveBeenCalledWith('Branch matched regex: dependabot-4')
  expect(infoMock).toHaveBeenCalledWith('Checking green status: dependabot-4')
  expect(infoMock).toHaveBeenCalledWith('Validating status: FAILURE')
  expect(infoMock).toHaveBeenCalledWith(
    'Discarding dependabot-4 with status FAILURE'
  )
  expect(infoMock).toHaveBeenCalledWith('Branch matched regex: dependabot-5')
  expect(infoMock).toHaveBeenCalledWith('Checking green status: dependabot-5')
  expect(infoMock).toHaveBeenCalledWith('Validating status: SUCCESS')
  expect(infoMock).toHaveBeenCalledWith('Validating review decision: null')
  expect(infoMock).toHaveBeenCalledWith(
    'Branch dependabot-5 has no required reviewers - OK'
  )
  expect(infoMock).toHaveBeenCalledWith('Checking labels: dependabot-1')
  expect(infoMock).toHaveBeenCalledWith('Checking ignore_label for: question')
  expect(infoMock).toHaveBeenCalledWith('Adding branch to array: dependabot-1')
  expect(infoMock).toHaveBeenCalledWith('Checking labels: dependabot-2')
  expect(infoMock).toHaveBeenCalledWith('Adding branch to array: dependabot-2')
  expect(infoMock).toHaveBeenCalledWith('Checking labels: dependabot-3')
  expect(infoMock).toHaveBeenCalledWith('Checking ignore_label for: nocombine')
  expect(infoMock).toHaveBeenCalledWith(
    'Discarding dependabot-3 with label nocombine because it matches ignore_label'
  )
  expect(infoMock).toHaveBeenCalledWith('Checking labels: dependabot-4')
  expect(infoMock).toHaveBeenCalledWith('Checking labels: dependabot-5')
  expect(infoMock).toHaveBeenCalledWith('Checking labels: dependabot-6')
  expect(infoMock).toHaveBeenCalledWith('Merged branch dependabot-1')
  expect(warningMock).toHaveBeenCalledWith(
    'Failed to merge branch dependabot-2'
  )
  expect(infoMock).toHaveBeenCalledWith('Merged branch dependabot-5')
  expect(infoMock).toHaveBeenCalledWith('Creating combined PR')
  expect(debugMock).toHaveBeenCalledWith(
    'PR body: # Combined PRs ➡️📦⬅️\n\n✅ The following pull requests have been successfully combined on this PR:\n- #1 Update dependency 1\n- #5 Update dependency 5\n\n⚠️ The following PRs were left out due to merge conflicts:\n- #2 Update dependency 2\n\n> This PR was created by the [`github/combine-prs`](https://github.com/github/combine-prs) action'
  )
  expect(infoMock).toHaveBeenCalledWith(
    'Combined PR url: https://github.com/test-owner/test-repo/pull/100'
  )
  expect(infoMock).toHaveBeenCalledWith('Combined PR number: 100')
  expect(setOutputMock).toHaveBeenCalledWith('pr_number', 100)
  expect(setOutputMock).toHaveBeenCalledWith(
    'pr_url',
    'https://github.com/test-owner/test-repo/pull/100'
  )
})

test('successfully runs the action with the select_label option', async () => {
  process.env.INPUT_CI_REQUIRED = false // just to reduce needed mocks
  process.env.INPUT_IGNORE_LABEL = 'no-combine'
  process.env.INPUT_SELECT_LABEL = 'please-combine'

  jest.spyOn(github, 'getOctokit').mockImplementation(() => {
    return {
      paginate: jest.fn().mockImplementation(() => {
        return [
          {
            number: 1,
            title: 'Update dependency 1',
            head: {
              ref: 'dependabot-random-label'
            },
            base: {
              ref: 'main'
            },
            labels: [
              {
                name: 'some-random-label'
              }
            ]
          },
          {
            number: 2,
            title: 'Update dependency 2',
            head: {
              ref: 'dependabot-select-label'
            },
            base: {
              ref: 'main'
            },
            labels: [
              {
                name: 'some-random-label'
              },
              {
                name: 'please-combine'
              },
              {
                name: 'another-label'
              }
            ]
          },
          {
            number: 3,
            title: 'Update dependency 3',
            head: {
              ref: 'dependabot-no-labels'
            },
            base: {
              ref: 'main'
            },
            labels: []
          },
          {
            number: 4,
            title: 'Update dependency 4',
            head: {
              ref: 'dependabot-both-ignore-and-select'
            },
            base: {
              ref: 'main'
            },
            labels: [
              {
                name: 'no-combine'
              },
              {
                name: 'please-combine'
              }
            ]
          },
          {
            number: 5,
            title: 'Update dependency 5',
            head: {
              ref: 'dependabot-only-select'
            },
            base: {
              ref: 'main'
            },
            labels: [
              {
                name: 'please-combine'
              }
            ]
          }
        ]
      }),
      rest: {
        git: {
          createRef: jest.fn().mockReturnValueOnce({
            data: {}
          })
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

  expect(await run()).toBe('success')

  expect(infoMock).toHaveBeenCalledWith(
    'Checking labels: dependabot-random-label'
  )
  expect(infoMock).toHaveBeenCalledWith(
    'Checking select_label for: some-random-label'
  )
  expect(infoMock).toHaveBeenCalledWith(
    'Discarding dependabot-random-label because it does not match select_label'
  )

  expect(infoMock).toHaveBeenCalledWith(
    'Checking labels: dependabot-select-label'
  )
  expect(infoMock).toHaveBeenCalledWith(
    'Checking select_label for: some-random-label'
  )
  expect(infoMock).toHaveBeenCalledWith(
    'Checking select_label for: please-combine'
  )
  expect(infoMock).toHaveBeenCalledWith(
    'Checking ignore_label for: some-random-label'
  )
  expect(infoMock).toHaveBeenCalledWith(
    'Checking ignore_label for: please-combine'
  )
  expect(infoMock).toHaveBeenCalledWith(
    'Checking ignore_label for: another-label'
  )
  expect(infoMock).toHaveBeenCalledWith(
    'Adding branch to array: dependabot-select-label'
  )

  expect(infoMock).toHaveBeenCalledWith('Checking labels: dependabot-no-labels')
  expect(infoMock).toHaveBeenCalledWith(
    'Discarding dependabot-no-labels because it does not match select_label'
  )

  expect(infoMock).toHaveBeenCalledWith(
    'Checking labels: dependabot-both-ignore-and-select'
  )
  expect(infoMock).toHaveBeenCalledWith('Checking select_label for: no-combine')
  expect(infoMock).toHaveBeenCalledWith(
    'Checking select_label for: please-combine'
  )
  expect(infoMock).toHaveBeenCalledWith('Checking ignore_label for: no-combine')
  expect(infoMock).toHaveBeenCalledWith(
    'Discarding dependabot-both-ignore-and-select with label no-combine because it matches ignore_label'
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
        git: {
          createRef: jest.fn().mockRejectedValueOnce(new BigBadError('Oh no!'))
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

  expect(await run()).toBe('Failed to create combined branch')
  expect(setFailedMock).toHaveBeenCalledWith('Failed to create combined branch')
})

test('runs the action and finds the combine branch already exists and the PR also exists', async () => {
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
        git: {
          createRef: jest
            .fn()
            .mockRejectedValueOnce(
              new AlreadyExistsError('Reference already exists')
            )
        },
        repos: {
          merge: jest.fn().mockReturnValueOnce({
            data: {}
          })
        },
        pulls: {
          create: jest
            .fn()
            .mockRejectedValueOnce(new AlreadyExistsError('PR already exists')),
          list: jest.fn().mockReturnValueOnce({
            data: [
              {
                number: 100
              }
            ]
          }),
          update: jest.fn().mockReturnValueOnce({
            data: {}
          })
        }
      }
    }
  })

  expect(await run()).toBe('success')
  expect(warningMock).toHaveBeenCalledWith(
    'Branch already exists - will try to merge into it'
  )
  expect(setOutputMock).toHaveBeenCalledWith('pr_number', 100)
})

test('runs the action and finds the combine branch already exists and the PR also exists and the PR is in a closed state', async () => {
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
        git: {
          createRef: jest
            .fn()
            .mockRejectedValueOnce(
              new AlreadyExistsError('Reference already exists')
            )
        },
        repos: {
          merge: jest.fn().mockReturnValueOnce({
            data: {}
          })
        },
        pulls: {
          create: jest
            .fn()
            .mockRejectedValueOnce(new AlreadyExistsError('PR already exists')),
          list: jest.fn().mockReturnValueOnce({
            data: [
              {
                number: 100,
                state: 'closed'
              }
            ]
          }),
          update: jest.fn().mockReturnValue({
            data: {}
          })
        }
      }
    }
  })

  expect(await run()).toBe('success')
  expect(warningMock).toHaveBeenCalledWith(
    'Branch already exists - will try to merge into it'
  )
  expect(setOutputMock).toHaveBeenCalledWith('pr_number', 100)
})

test('runs the action and only one branch matches criteria', async () => {
  jest.spyOn(github, 'getOctokit').mockImplementation(() => {
    return {
      paginate: jest.fn().mockImplementation(() => {
        return [
          {
            number: 1,
            head: {
              ref: 'dependabot-only-branch'
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

  expect(await run()).toBe(
    'Only one PR/branch matched criteria. No need to combine.'
  )
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

test('runs the action with no prefix or regex set', async () => {
  process.env.INPUT_BRANCH_PREFIX = ''
  process.env.INPUT_BRANCH_REGEX = ''
  expect(await run()).toBe('Must specify either branch_prefix or branch_regex')
})

test('runs the action when select_label and ignore_label have the same value', async () => {
  process.env.INPUT_IGNORE_LABEL = ''
  process.env.INPUT_SELECT_LABEL = ''
  expect(await run()).toBe('success')

  process.env.INPUT_IGNORE_LABEL = 'some-label'
  process.env.INPUT_SELECT_LABEL = 'some-label'
  expect(await run()).toBe(
    'ignore_label and select_label cannot have the same value'
  )
})
