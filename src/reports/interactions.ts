export interface InteractionEdge {
  source: string;
  target: string;
  weight: number;
}

interface LiveInteractionDatasets {
  users: Record<string, unknown>[];
  questions: Record<string, unknown>[];
  answers: Record<string, unknown>[];
  comments: Record<string, unknown>[];
}

interface ContentOwner {
  ownerUserId: number | null;
  questionId?: number | null;
}

export function buildInteractionSummary(edges: InteractionEdge[]) {
  const copiedEdges = edges.map((edge) => ({ ...edge }));
  const nodes = [...new Set(edges.flatMap((edge) => [edge.source, edge.target]))].sort();
  return {
    totalInteractions: copiedEdges.reduce((sum, edge) => sum + edge.weight, 0),
    nodes,
    edges: copiedEdges,
    topEdges: [...copiedEdges].sort((a, b) => b.weight - a.weight).slice(0, 10),
  };
}

export function buildInteractionEdgesFromLiveContent(datasets: LiveInteractionDatasets): InteractionEdge[] {
  const userDepartments = buildUserDepartmentMap(datasets.users);
  const questionOwners = new Map<number, ContentOwner>();
  const answerOwners = new Map<number, ContentOwner>();
  const edgeWeights = new Map<string, InteractionEdge>();

  for (const question of datasets.questions) {
    const questionId = getNumberField(question, "question_id", "questionId");
    if (questionId === null) continue;

    questionOwners.set(questionId, { ownerUserId: getOwnerUserId(question) });
  }

  for (const answer of datasets.answers) {
    const answerId = getNumberField(answer, "answer_id", "answerId");
    const questionId = getNumberField(answer, "question_id", "questionId");
    const ownerUserId = getOwnerUserId(answer);

    if (answerId !== null) {
      answerOwners.set(answerId, { ownerUserId, questionId });
    }

    const questionOwnerId = questionId === null ? null : questionOwners.get(questionId)?.ownerUserId ?? null;
    addDepartmentEdge(edgeWeights, userDepartments, ownerUserId, questionOwnerId);
  }

  for (const comment of datasets.comments) {
    const commentOwnerId = getOwnerUserId(comment);
    const postId = getNumberField(comment, "post_id", "postId");
    const targetOwnerId = getCommentTargetOwnerId(postId, questionOwners, answerOwners);

    addDepartmentEdge(edgeWeights, userDepartments, commentOwnerId, targetOwnerId);
  }

  return [...edgeWeights.values()].sort(
    (a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target),
  );
}

function buildUserDepartmentMap(users: Record<string, unknown>[]): Map<number, string> {
  const departments = new Map<number, string>();

  for (const user of users) {
    const userId = getNumberField(user, "user_id", "userId", "id");
    if (userId === null) continue;

    departments.set(userId, getStringField(user, "department", "Department") ?? "Unknown");
  }

  return departments;
}

function getCommentTargetOwnerId(
  postId: number | null,
  questionOwners: Map<number, ContentOwner>,
  answerOwners: Map<number, ContentOwner>,
): number | null {
  if (postId === null) {
    return null;
  }

  return answerOwners.get(postId)?.ownerUserId ?? questionOwners.get(postId)?.ownerUserId ?? null;
}

function addDepartmentEdge(
  edges: Map<string, InteractionEdge>,
  userDepartments: Map<number, string>,
  sourceUserId: number | null,
  targetUserId: number | null,
) {
  const source = sourceUserId === null ? "Unknown" : userDepartments.get(sourceUserId) ?? "Unknown";
  const target = targetUserId === null ? "Unknown" : userDepartments.get(targetUserId) ?? "Unknown";
  const key = `${source}\u0000${target}`;
  const existing = edges.get(key);

  if (existing) {
    existing.weight += 1;
    return;
  }

  edges.set(key, { source, target, weight: 1 });
}

function getOwnerUserId(record: Record<string, unknown>): number | null {
  const owner = record.owner;
  if (isRecord(owner)) {
    return getNumberField(owner, "user_id", "userId", "id");
  }

  return getNumberField(record, "owner_user_id", "ownerUserId", "user_id", "userId");
}

function getNumberField(record: Record<string, unknown>, ...fieldNames: string[]): number | null {
  for (const fieldName of fieldNames) {
    const value = record[fieldName];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function getStringField(record: Record<string, unknown>, ...fieldNames: string[]): string | null {
  for (const fieldName of fieldNames) {
    const value = record[fieldName];
    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
