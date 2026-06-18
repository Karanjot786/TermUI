export { useCommander } from './commander/index.js'
export type { CommanderResult } from './commander/index.js'
export { useGit } from './git/index.js'
export type { GitAdapter, GitStatusResult } from './git/index.js'
export { useConf } from './conf/index.js'
export type { SetConfValue, UseConfResult } from './conf/index.js'
export { useGitHub } from './github/index.js'
export type {
  GitHubNamespace,
  UseGitHubResult,
  ReposListParams,
  Repo,
  IssuesListParams,
  Issue,
  PrsListParams,
  PullRequest,
  ReleasesListParams,
  Release,
} from './github/index.js'
export { useKeychain } from './keychain/index.js'
export type { UseKeychainResult } from './keychain/index.js'

export { zodValidator } from './zod/index.js'
export type { PromptValidator } from './zod/index.js'
export { chalkToTermUI } from './chalk/index.js'
export { useClipboard } from './clipboardy/index.js'
export type { UseClipboardResult } from './clipboardy/index.js'

export { useAI } from './ai/index.js'
export type {
  AIAdapter,
  AIMessage,
  AIOptions,
  AIProvider,
} from './ai/index.js'

export { LocalVectorStore, indexDirectory, chunkText } from './ai/vectorStore.js'
export type { DocumentChunk, VectorStoreOptions } from './ai/vectorStore.js'
export { RAGChat } from './ai/RAGChat.js'
export type { RAGChatOptions } from './ai/RAGChat.js'

export { useDotenv } from './dotenv/index.js'
export type { DotenvValues, UseDotenvResult } from './dotenv/index.js'
export { useLocalStorage } from './localStorage/index.js'
export type { LocalStorageAdapter } from './localStorage/index.js'

export { useExeca, useShell } from './execa/index.js'
export type { UseExecaResult } from './execa/index.js'
