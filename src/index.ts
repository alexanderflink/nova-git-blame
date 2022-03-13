const path = nova.path

const REQUEST_TIMEOUT = 3000

function sendNotificationRequest(notificationRequest: NotificationRequest) {
  nova.notifications.add(notificationRequest)

  setTimeout(cancelNotificationRequest.bind(null, notificationRequest), REQUEST_TIMEOUT)
}

function cancelNotificationRequest(notificationRequest: NotificationRequest) {
  nova.notifications.cancel(notificationRequest.identifier)
}

nova.commands.register('nova-git-blame.blame', (editor: TextEditor) => {
  const lines: string[] = []

  const notification = new NotificationRequest('git-blame')
  notification.title = 'Git blame'

  const { document, selectedRange } = editor
  const lineRange = editor.getLineRangeForRange(selectedRange)

  const startLine =
    (editor.getTextInRange(new Range(0, lineRange.start)).match(new RegExp(document.eol, 'g'))
      ?.length ?? 0) + 1

  const endLine = editor
    .getTextInRange(new Range(0, lineRange.end))
    .match(new RegExp(document.eol, 'g'))?.length

  // only run git blame on local and saved documents
  if (!document.isRemote && document.path) {
    const process = new Process('/usr/bin/env', {
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

    process.start()

    process.onStdout((line: string) => {
      lines.push(line.replace(document.eol, ''))
    })

    process.onDidExit(() => {
      const author = lines[1].split(' ').slice(1).join(' ')
      const email = lines[2].split(' ').slice(1).join(' ')
      const time = lines[3].split(' ').slice(1).join(' ')
      const date = new Date(Number(time) * 1000)

      const message = `${author}\n${email}\n${date}`
      notification.body = message
      console.log(lines)
      notification.actions = ['Close', 'View on github']
      sendNotificationRequest(notification)
    })

    process.onStderr((line: string) => {
      console.error(line)
      notification.body = line
      sendNotificationRequest(notification)
    })
  } else {
    notification.body = 'Cannot git blame remote or unsaved documents!'
  }
})
