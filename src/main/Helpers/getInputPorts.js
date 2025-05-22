import { execSync } from 'child_process'

const COMMAND_GET_INPUT_DEVICE_EVENT_NUMBER =
  "grep -E 'Handlers|EV=' /proc/bus/input/devices |" +
  "grep -B1 'EV=120013' |" +
  "grep -Eo 'event[0-9]+' |" +
  "grep -Eo '[0-9]+' |" +
  "tr -d '\n'"

function executeCommand(cmd) {
  try {
    const result = execSync(cmd, { encoding: 'utf-8' })
    return result.trim()
  } catch (error) {
    console.error(`Error executing command ${error.message}`)
    process.exit(1)
  }
}

export function getInputDevicePath() {
  const eventNumber = executeCommand(COMMAND_GET_INPUT_DEVICE_EVENT_NUMBER)
  return `/dev/input/event${eventNumber}`
}
