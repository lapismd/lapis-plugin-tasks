import {
  lifecycleInputs,
  type LifecycleInput,
} from "./native-lifecycle-inputs.test.fixture";

/** Add valid authored duration targets without rewriting the retained original corpus. */
export function durationLifecycleInputs(): LifecycleInput[] {
  return lifecycleInputs()
    .filter((input) => input.raw.includes("    targetMinutes: 30\n"))
    .map((input) => ({
      ...input,
      name: `valid duration / ${input.name}`,
      raw: input.raw.replace("    targetMinutes: 30\n", "    target: 30m\n"),
    }));
}
