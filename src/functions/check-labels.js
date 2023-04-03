import * as core from '@actions/core'

export async function checkLabels(pull, branch, selectLabel, ignoreLabel) {
  core.info('Checking labels: ' + branch)
  const labels = pull['labels']

  if (selectLabel) {
    let matchesSelectLabel = false
    for (const label of labels) {
      const labelName = label['name']
      core.info('Checking select_label for: ' + labelName)
      if (labelName == selectLabel) {
        matchesSelectLabel = true
        break
      }
    }
    if (!matchesSelectLabel) {
      core.info(
        'Discarding ' + branch + ' because it does not match select_label'
      )
      return false
    }
  }

  if (ignoreLabel) {
    for (const label of labels) {
      const labelName = label['name']
      core.info('Checking ignore_label for: ' + labelName)
      if (labelName == ignoreLabel) {
        core.info(
          'Discarding ' +
            branch +
            ' with label ' +
            labelName +
            ' because it matches ignore_label'
        )
        return false
      }
    }
  }

  return true
}
