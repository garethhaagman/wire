import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card.js";

const meta = {
  title: "Card",
  component: Card,
  parameters: {
    docs: {
      description: {
        component:
          "Container for grouped content: workspace settings panels, agent configuration, webhook endpoints.",
      },
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Workspace members</CardTitle>
        <CardDescription>
          Invite teammates and manage their roles in this workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button size="sm">Invite member</Button>
      </CardContent>
    </Card>
  ),
};

export const HeaderOnly: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>No content below</CardTitle>
        <CardDescription>
          CardContent is optional; compose only the parts a given panel needs.
        </CardDescription>
      </CardHeader>
    </Card>
  ),
};

/** A real Wire use case: an agent configuration card with status and an action. */
export const AgentConfig: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>@oncall-bot</CardTitle>
        <CardDescription>harness_claude-code, 12 runs today</CardDescription>
      </CardHeader>
      <CardContent>
        <Button size="sm" variant="destructive">
          Remove agent
        </Button>
      </CardContent>
    </Card>
  ),
};
