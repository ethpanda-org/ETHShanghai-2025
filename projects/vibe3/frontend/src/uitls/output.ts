import stripAnsi from 'strip-ansi'

export function stripOutput(output: string) {
    return stripAnsi(output)
    .replace(/\(node:\d+\) ExperimentalWarning: WASI is an experimental feature and might change at any time/g, '')
    .replace(/\(Use `node --trace-warnings \.\.\.` to show where the warning was created\)/g, '');
}