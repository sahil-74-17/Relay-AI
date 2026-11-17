import type { Category } from "../generated/prisma/enums";
import type { TeamRepository } from "../repositories/team.repository";
import type { UserRepository } from "../repositories/user.repository";

/** How an agent is chosen inside a team. Swappable (round-robin, skills...). */
export interface AssignmentStrategy {
  pickAgent(teamId: string): Promise<{ id: string; name: string } | null>;
}

export class LeastLoadedAssignment implements AssignmentStrategy {
  constructor(private readonly users: UserRepository) {}

  async pickAgent(teamId: string) {
    const agents = await this.users.agentsWithWorkload(teamId);
    if (!agents.length) return null;
    const best = agents.reduce((a, b) => (b._count.assignedTickets < a._count.assignedTickets ? b : a));
    return { id: best.id, name: best.name };
  }
}

export interface RoutingDecision {
  team: { id: string; name: string } | null;
  agent: { id: string; name: string } | null;
  reason: string;
}

/** Maps an (ML-predicted) category to the owning team, optionally picking an agent. */
export class RoutingService {
  constructor(private readonly teams: TeamRepository, private readonly assignment: AssignmentStrategy) {}

  async route(category: Category, { assignAgent }: { assignAgent: boolean }): Promise<RoutingDecision> {
    const team = (await this.teams.findByCategory(category)) ?? (await this.teams.findByCategory("GENERAL"));
    if (!team) return { team: null, agent: null, reason: "No team configured for this category" };
    const agent = assignAgent ? await this.assignment.pickAgent(team.id) : null;
    const reason = !assignAgent
      ? `Held for human review before assigning an agent`
      : agent
        ? `Assigned to ${agent.name}, who has the lightest open workload in ${team.name}`
        : `No available agents in ${team.name}; waiting in the team queue`;
    return { team: { id: team.id, name: team.name }, agent, reason };
  }
}
