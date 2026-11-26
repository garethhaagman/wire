import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input.js";

const meta = {
  title: "Input",
  component: Input,
  parameters: {
    docs: {
      description: {
        component:
          "Native input wrapper used across auth forms, workspace settings, and webhook configuration.",
      },
    },
  },
  args: {
    placeholder: "you@example.com",
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "dev@wire.local" },
};

export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: "not-an-email" },
};

export const Password: Story = {
  args: { type: "password", placeholder: "Enter your password" },
};

export const Url: Story = {
  args: {
    type: "url",
    placeholder: "https://example.com/webhooks/wire",
  },
};

/** Every placeholder/value Input actually renders with in apps/web, in one place. */
export const RealWorldExamples: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-3">
      <Input placeholder="you@example.com" type="email" />
      <Input placeholder="oncall-bot" />
      <Input placeholder="harness_claude-code" />
      <Input placeholder="https://example.com/webhooks/wire" type="url" />
      <Input placeholder="message.created, thread.reply" />
    </div>
  ),
};
