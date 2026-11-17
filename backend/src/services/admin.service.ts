import type { Role } from "../generated/prisma/enums";
import type { TeamRepository } from "../repositories/team.repository";
import type { UserRepository } from "../repositories/user.repository";
import type { AuthUser } from "../types/auth";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/errors";
import { type PageParams, paginate } from "../utils/pagination";
import type { TeamDto, UpdateUserDto } from "../validators/admin.validators";

export class AdminService {
  constructor(private readonly users: UserRepository, private readonly teams: TeamRepository) {}

  async listUsers(filter: { q?: string; role?: Role }, page: PageParams) {
    const { items, total } = await this.users.list(filter, page);
    return paginate(items, total, page);
  }

  async updateUser(actor: AuthUser, id: string, dto: UpdateUserDto) {
    if (actor.id === id && (dto.role && dto.role !== "ADMIN" || dto.isActive === false)) {
      throw new BadRequestError("You can't remove your own admin access");
    }
    if (!(await this.users.findById(id))) throw new NotFoundError("User");
    if (dto.teamId && !(await this.teams.findById(dto.teamId))) throw new BadRequestError("Team does not exist");
    return this.users.update(id, dto);
  }

  listAgents() {
    return this.users.listAgents();
  }

  listTeams() {
    return this.teams.list();
  }

  async createTeam(dto: TeamDto) {
    try {
      return await this.teams.create({ name: dto.name, description: dto.description, category: dto.category ?? null });
    } catch {
      throw new ConflictError("A team with this name or category already exists");
    }
  }

  async updateTeam(id: string, dto: Partial<TeamDto>) {
    if (!(await this.teams.findById(id))) throw new NotFoundError("Team");
    try {
      return await this.teams.update(id, dto);
    } catch {
      throw new ConflictError("A team with this name or category already exists");
    }
  }
}
