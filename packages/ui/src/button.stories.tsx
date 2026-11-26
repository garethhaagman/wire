import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button.js";

const meta = {
  title: "Button",
  component: Button,
  parameters: {
    docs: {
      description: {
        component:
          "Wire's primary interactive control. Used for sending messages, confirming destructive actions, and triggering workspace/agent operations.",
      },
    },
  },
  args: {
    children: "Send message",
    disabled: false,
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "ghost", "destructive"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: "Send message" } };

export const Secondary: Story = {
  args: { variant: "secondary", children: "Save draft" },
};

export const Outline: Story = {
  args: { variant: "outline", children: "Cancel" },
};

export const Ghost: Story = {
  args: { variant: "ghost", children: "Dismiss" },
};

export const Destructive: Story = {
  args: { variant: "destructive", children: "Remove agent" },
};

export const Disabled: Story = {
  args: { disabled: true, children: "Sending..." },
};

/** All five variants side by side, with Wire-specific labels for each use case they actually appear in. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="default">Send message</Button>
      <Button variant="secondary">Save draft</Button>
      <Button variant="outline">Cancel</Button>
      <Button variant="ghost">Dismiss</Button>
      <Button variant="destructive">Remove agent</Button>
    </div>
  ),
};

/** All four sizes, matching the icon/compact/default/large contexts Button actually renders in across apps/web (compose bar, settings forms, panel actions). */
export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Add webhook</Button>
      <Button size="default">Add agent</Button>
      <Button size="lg">Create workspace</Button>
      <Button size="icon">+</Button>
    </div>
  ),
};

/** Pending state while a request is in flight: label changes, control disables, no layout shift. */
export const LoadingState: Story = {
  render: () => (
    <div className="flex gap-3">
      <Button disabled>Creating workspace...</Button>
      <Button disabled variant="destructive">
        Removing agent...
      </Button>
    </div>
  ),
};
