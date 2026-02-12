import { createSimpleContext } from "@opencode-ai/ui/context"
import { usePlatform } from "@/context/platform"

type SkillsAction = "list" | "find" | "add" | "remove" | "check" | "update"

type SkillsInput = {
  action: SkillsAction
  query?: string
  source?: string
  skills?: string[]
  agents?: string[]
  global?: boolean
  yes?: boolean
}

type SkillsResult = {
  command: string[]
  stdout: string
  stderr: string
  status: number
}

const run = async (
  platform: ReturnType<typeof usePlatform>,
  input: SkillsInput,
): Promise<SkillsResult> => {
  if (!platform.runSkillsCommand) {
    throw new Error("skills CLI is only available in the desktop build")
  }

  return platform.runSkillsCommand(input)
}

export const { use: useSkills, provider: SkillsProvider } = createSimpleContext({
  name: "Skills",
  init: () => {
    const platform = usePlatform()

    return {
      list: (input?: Pick<SkillsInput, "global" | "agents">) => run(platform, { action: "list", ...input }),
      find: (query: string) => run(platform, { action: "find", query }),
      add: (input: Required<Pick<SkillsInput, "source">> & Omit<SkillsInput, "action" | "query">) =>
        run(platform, { action: "add", yes: true, ...input }),
      remove: (input?: Pick<SkillsInput, "skills" | "agents" | "global">) =>
        run(platform, { action: "remove", yes: true, ...input }),
      check: () => run(platform, { action: "check" }),
      update: () => run(platform, { action: "update", yes: true }),
    }
  },
})
