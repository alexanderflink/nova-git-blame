function activate() {}

function deactivate() {}

function sendNotificationRequest(notificationRequest: NotificationRequest) {
  nova.notifications.add(notificationRequest)
}

// Invoked by the "Foobar" command
nova.commands.register('nova-git-blame.blame', (editor: TextEditor) => {
  // const process = new Process('/usr/bin/env', {
  //   args: ['git', 'blame', ]
  // })

  const notification = new NotificationRequest('git-blame')
  notification.title = 'Git blame'

  const { document } = editor

  // only run git blame on local and saved documents
  if (!document.isRemote && document.path) {
    const process = new Process('/usr/bin/env', { args: ['git', 'blame', document.path] })

    process.start()

    process.onStdout((line: string) => {
      console.log('onStdout', line)
      notification.actions = ['View on github']
    })

    process.onStderr((line: string) => {
      console.error(line)
      notification.body = line
      sendNotificationRequest(notification)
    })
  } else {
    notification.body = 'Cannot git blame remote or unsaved documents!'
  }

  console.log('uri', editor.document.uri)
  console.log('path', editor.document.path)

  // Begin an edit session
  const position = editor.selectedRange.start

  // editor.edit(function (e) {
  //   // Insert the string "Foobar"
  //   e.insert(position, 'Foobar')
  // })
})

export { activate, deactivate }
