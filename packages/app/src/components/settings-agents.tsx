import { Button } from "@opencode-ai/ui/button"
import { Select } from "@opencode-ai/ui/select"
import { TextField } from "@opencode-ai/ui/text-field"
import { showToast } from "@opencode-ai/ui/toast"
import { Component, createMemo, createSignal } from "solid-js"
import { useLanguage } from "@/context/language"
import { useSettings } from "@/context/settings"

export const SettingsAgents: Component = () => {
  const language = useLanguage()
  const settings = useSettings()

  const options = createMemo(
    () =>
      [
        { value: "pragmatic", label: "Pragmatic" },
        { value: "helpful", label: "Helpful" },
        { value: "thorough", label: "Thorough" },
      ] as Array<{ value: "pragmatic" | "helpful" | "thorough"; label: string }>,
  )

  const [instructions, setInstructions] = createSignal(settings.personalization.instructions())

  const save = () => {
    settings.personalization.setInstructions(instructions())
    showToast({
      variant: "success",
      icon: "circle-check",
      title: "Personalization saved",
      description: "Applies to new sessions in this app.",
    })
  }

  return (
    <div class="flex flex-col h-full overflow-y-auto no-scrollbar px-4 pb-10 sm:px-10 sm:pb-10">
      <div class="sticky top-0 z-10 bg-[linear-gradient(to_bottom,var(--surface-raised-stronger-non-alpha)_calc(100%_-_24px),transparent)]">
        <div class="flex flex-col gap-1 pt-6 pb-8 max-w-[720px]">
          <h2 class="text-16-medium text-text-strong">{language.t("settings.agents.title")}</h2>
          <p class="text-14-regular text-text-weak">Set your default tone and custom instructions for OpenCodex.</p>
        </div>
      </div>

      <div class="flex flex-col gap-8 max-w-[720px]">
        <div class="bg-surface-raised-base px-4 rounded-lg">
          <div class="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-border-weak-base">
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-14-medium text-text-strong">Personality</span>
              <span class="text-12-regular text-text-weak">Default response tone for new sessions.</span>
            </div>
            <div class="flex-shrink-0">
              <Select
                options={options()}
                current={options().find((item) => item.value === settings.personalization.personality())}
                value={(item) => item.value}
                label={(item) => item.label}
                onSelect={(option) => {
                  if (!option) return
                  settings.personalization.setPersonality(option.value)
                }}
                variant="secondary"
                size="small"
                triggerVariant="settings"
              />
            </div>
          </div>

          <div class="flex flex-col gap-3 py-3">
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-14-medium text-text-strong">Custom instructions</span>
              <span class="text-12-regular text-text-weak">
                Personal guidance for the agent. Keep it short and specific.
              </span>
            </div>

            <TextField
              multiline
              value={instructions()}
              onChange={setInstructions}
              placeholder="Examples: prefer minimal diffs, prioritize performance regressions, always suggest tests."
              class="min-h-[140px]"
            />

            <div class="flex justify-end">
              <Button variant="secondary" onClick={save}>
                Save
              </Button>
            </div>
          </div>
        </div>

        <div class="text-12-regular text-text-weak">
          Personality and instructions are currently stored locally in OpenCodex and are intended for session defaults.
        </div>
      </div>
    </div>
  )
}
