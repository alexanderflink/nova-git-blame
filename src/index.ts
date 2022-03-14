import getProcessOutput from './utils/getProcessOutput'

const path = nova.path

const REQUEST_TIMEOUT = 3000

const GITHUB_URL = 'https://github.com'

function sendNotificationRequest(notificationRequest: NotificationRequest) {
  setTimeout(cancelNotificationRequest.bind(null, notificationRequest), REQUEST_TIMEOUT)

  return nova.notifications.add(notificationRequest)
}

function cancelNotificationRequest(notificationRequest: NotificationRequest) {
  nova.notifications.cancel(notificationRequest.identifier)
}

nova.commands.register('nova-git-blame.blame', (editor: TextEditor) => {
  const { document, selectedRange } = editor

  const notification = new NotificationRequest('git-blame')
  notification.title = 'Git blame'

  const lineRange = editor.getLineRangeForRange(selectedRange)

  const startLine =
    (editor.getTextInRange(new Range(0, lineRange.start)).match(new RegExp(document.eol, 'g'))
      ?.length ?? 0) + 1

  const endLine = editor
    .getTextInRange(new Range(0, lineRange.end))
    .match(new RegExp(document.eol, 'g'))?.length

  // only run git blame on local and saved documents
  if (!document.isRemote && document.path && startLine && endLine) {
    getProcessOutput('/usr/bin/env', {
      cwd: path.dirname(document.path),
      args: [
        'git',
        'blame',
        '--line-porcelain',
        '--date',
        'local',
        '-L',
        `${startLine},${endLine}`,
        document.path,
      ],
    })
      .then((lines) => {
        const blame = lines.reduce((acc: Record<string, string>, line: string) => {
          const parts = line.split(' ')
          const key = parts.shift()

          if (key) {
            acc[key] = parts.join(' ').replace(document.eol, '')
          }

          return acc
        }, {} as Record<string, string>)

        const date = new Date(Number(blame['author-time']) * 1000)

        const message = `${blame.author}\n${blame['author-mail']}\n${date.toString()}`
        notification.body = message
        notification.actions = ['View on github']

        sendNotificationRequest(notification)
          .then(async (notificationResponse) => {
            if (notificationResponse.actionIdx === 0 && document.path) {
              // user pressed "View on Github"
              const remoteOutput = await getProcessOutput('/usr/bin/env', {
                cwd: path.dirname(document.path),
                args: ['git', 'remote', '-v'],
              })

              const remoteFetchUrl = remoteOutput[0]

              const matches = remoteFetchUrl.match(/git@github.com:(.*).git/)
              const repoUri = matches?.[1]

              const commitOutput = await getProcessOutput('/usr/bin/env', {
                cwd: path.dirname(document.path),
                args: ['git', 'rev-parse', 'HEAD'],
              })

              const commit = commitOutput[0].replace(document.eol, '')

              if (repoUri && commit) {
                console.log(
                  `${GITHUB_URL}/${repoUri}/blame/${commit}/${blame.filename}#L${startLine}-L${endLine}`,
                )
                nova.openURL(
                  `${GITHUB_URL}/${repoUri}/blame/${commit}/${blame.filename}#L${startLine}-L${endLine}`,
                )
              } else {
                console.error('Could not open repository')
              }
            }
          })
          .catch(console.error)
      })
      .catch((error: string) => {
        console.error(error)
        notification.body = error
        sendNotificationRequest(notification).catch(console.error)
      })
  } else {
    notification.body = 'Cannot git blame remote or unsaved documents!'
  }
})
