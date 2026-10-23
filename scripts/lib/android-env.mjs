// Shared helpers for the Android scripts: find a JDK (Android Studio's bundled one
// if JAVA_HOME is unset) and build the process env and Gradle wrapper command.
import { existsSync } from 'node:fs'
import { platform } from 'node:os'
import { delimiter, join } from 'node:path'

function javaExecutable(javaHome) {
  return join(javaHome, 'bin', platform() === 'win32' ? 'java.exe' : 'java')
}

export function resolveJavaHome() {
  if (process.env.JAVA_HOME && existsSync(javaExecutable(process.env.JAVA_HOME))) {
    return process.env.JAVA_HOME
  }

  const programFiles = process.env.ProgramFiles ?? 'C:\\Program Files'
  const candidates = [
    process.env.STUDIO_JDK,
    platform() === 'win32' ? join(programFiles, 'Android', 'Android Studio', 'jbr') : null,
    platform() === 'darwin' ? '/Applications/Android Studio.app/Contents/jbr/Contents/Home' : null,
    platform() === 'linux' ? '/opt/android-studio/jbr' : null,
  ].filter(Boolean)

  return candidates.find((candidate) => existsSync(javaExecutable(candidate))) ?? null
}

export function buildAndroidEnv() {
  const javaHome = resolveJavaHome()
  if (!javaHome) return process.env

  const javaBin = join(javaHome, 'bin')
  return {
    ...process.env,
    JAVA_HOME: javaHome,
    PATH: process.env.PATH ? `${javaBin}${delimiter}${process.env.PATH}` : javaBin,
  }
}

// Command + args to run the Gradle wrapper with the given tasks (cwd: android/).
export function gradleCommand(tasks) {
  return platform() === 'win32'
    ? { command: 'cmd.exe', args: ['/d', '/s', '/c', '.\\gradlew.bat', ...tasks] }
    : { command: './gradlew', args: tasks }
}
