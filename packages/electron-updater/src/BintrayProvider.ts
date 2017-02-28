import { HttpError } from "electron-builder-http"
import { BintrayClient } from "electron-builder-http/out/bintray"
import { CancellationToken } from "electron-builder-http/out/CancellationToken"
import { BintrayOptions, VersionInfo } from "electron-builder-http/out/publishOptions"
import { FileInfo, Provider } from "./api"

export class BintrayProvider extends Provider<VersionInfo> {
  private client: BintrayClient

  constructor(configuration: BintrayOptions) {
    super()

    this.client = new BintrayClient(configuration, new CancellationToken())
  }

  async getLatestVersion(): Promise<VersionInfo> {
    try {
      const data = await this.client.getVersion("_latest")
      return {
        version: data.name,
      }
    }
    catch (e) {
      if ("response" in e && e.response.statusCode === 404) {
        throw new Error(`No latest version, please ensure that user, package and repository correctly configured. Or at least one version is published. ${e.stack || e.message}`)
      }
      throw e
    }
  }

  async getUpdateFile(versionInfo: VersionInfo): Promise<FileInfo> {
    try {
      const files = await this.client.getVersionFiles(versionInfo.version)
      const suffix = `${versionInfo.version}.exe`
      const file = files.find(it => it.name.endsWith(suffix) && it.name.includes("Setup")) || files.find(it => it.name.endsWith(suffix)) || files.find(it => it.name.endsWith(".exe"))
      if (file == null) {
        //noinspection ExceptionCaughtLocallyJS
        throw new Error(`Cannot find suitable file for version ${versionInfo.version} in: ${JSON.stringify(files, null, 2)}`)
      }

      return {
        name: file.name,
        url: `https://dl.bintray.com/${this.client.owner}/${this.client.repo}/${file.name}`,
        sha2: file.sha256,
      }
    }
    catch (e) {
      if (e instanceof HttpError && e.response.statusCode === 404) {
        throw new Error(`No latest version, please ensure that user, package and repository correctly configured. Or at least one version is published. ${e.stack || e.message}`)
      }
      throw e
    }
  }
}