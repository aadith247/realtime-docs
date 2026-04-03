export interface RGANode {
  id: string;       // "{userId}-{counter}" e.g. "alice-1"
  char: string;     // the character
  afterId: string;  // comes after this node. "root" = beginning
  deleted: boolean; // true = invisible but stays in array
}

export interface InsertOp {
  type: "insert";
  id: string;
  char: string;
  afterId: string;
  userId: string;
}

export interface DeleteOp {
  type: "delete";
  targetId: string;
  userId: string;
}

export type RGAOperation = InsertOp | DeleteOp;
