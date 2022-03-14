function getProcessOutput(
  command: string,
  options?: {
    args?: string[]
    env?: { [key: string]: string }
    cwd?: string
    stdio?:
      | ['pipe' | 'ignore', 'pipe' | 'ignore', 'pipe' | 'ignore']
      | 'pipe'
      | 'ignore'
      | 'jsonrpc'
      | number
    shell?: true | string
  },
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const process = new Process(command, options)

    process.start()

    const output: string[] = []

    process.onStdout((line) => {
      output.push(line)
    })

    process.onDidExit(() => {
      resolve(output)
    })

    process.onStderr((err) => {
      reject(err)
    })
  })
}

export default getProcessOutput
