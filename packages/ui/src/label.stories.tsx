import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input.js";
import { Label } from "./label.js";

const meta = {
  title: "Label",
  component: Label,
  parameters: {
    docs: {
      description: {
        component:
          "Paired with Input across auth forms, agent/webhook creation forms, and workspace settings.",
      },
    },
  },
  args: {
    children: "Email address",
  },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithInput: Story = {
  render: (args) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="story-email">{args.children}</Label>
      <Input id="story-email" placeholder="you@example.com" />
    </div>
  ),
};

/** Every label/input pairing Label actually appears in across apps/web forms. */
export const RealWorldExamples: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="story-handle">Handle</Label>
        <Input id="story-handle" placeholder="oncall-bot" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="story-harness">Harness ID</Label>
        <Input id="story-harness" placeholder="harness_claude-code" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="story-url">Endpoint URL</Label>
        <Input
          id="story-url"
          placeholder="https://example.com/webhooks/wire"
          type="url"
        />
      </div>
    </div>
  ),
};
