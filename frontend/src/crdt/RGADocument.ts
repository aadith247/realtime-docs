import { RGANode, InsertOp, DeleteOp } from "./types";

export class RGADocument {
  private nodes: RGANode[] = [
    { id: "root", char: "", afterId: "", deleted: false }
  ];

  applyInsert(op: InsertOp): void {
    // Check if node already exists (idempotency)
    if (this.nodes.find(n => n.id === op.id)) {
      return;
    }

    // Find the index of the node we want to insert after
    const afterIndex = this.nodes.findIndex(n => n.id === op.afterId);
    if (afterIndex === -1) {
      // If afterId not found, append at end
      this.nodes.push({
        id: op.id,
        char: op.char,
        afterId: op.afterId,
        deleted: false
      });
      return;
    }

    // Find correct position: after the afterId node, but respecting existing nodes
    // that also reference the same afterId (use id comparison for ordering)
    let insertIndex = afterIndex + 1;
    
    // Skip over any nodes that come after the same afterId but have "greater" ids
    while (insertIndex < this.nodes.length) {
      const node = this.nodes[insertIndex];
      if (node.afterId === op.afterId && node.id > op.id) {
        insertIndex++;
      } else {
        break;
      }
    }

    // Insert the new node
    this.nodes.splice(insertIndex, 0, {
      id: op.id,
      char: op.char,
      afterId: op.afterId,
      deleted: false
    });
  }

  applyDelete(op: DeleteOp): void {
    // Find the node and mark as deleted (tombstone)
    const node = this.nodes.find(n => n.id === op.targetId);
    if (node) {
      node.deleted = true;
    }
  }

  getText(): string {
    return this.nodes
      .filter(n => !n.deleted && n.id !== "root")
      .map(n => n.char)
      .join("");
  }

  getNodes(): RGANode[] {
    return this.nodes;
  }

  loadNodes(nodes: RGANode[]): void {
    this.nodes = nodes;
  }

  // Get the node id at a specific visible position (for cursor mapping)
  getNodeIdAtPosition(position: number): string {
    let visibleIndex = 0;
    for (const node of this.nodes) {
      if (node.deleted || node.id === "root") continue;
      if (visibleIndex === position) {
        return node.id;
      }
      visibleIndex++;
    }
    // If position is at the end, return the last visible node id
    // or "root" if no visible nodes
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      if (!this.nodes[i].deleted && this.nodes[i].id !== "root") {
        return this.nodes[i].id;
      }
    }
    return "root";
  }

  // Get the afterId for inserting at a specific visible position
  getAfterIdForPosition(position: number): string {
    if (position === 0) return "root";
    
    let visibleIndex = 0;
    for (const node of this.nodes) {
      if (node.deleted || node.id === "root") continue;
      visibleIndex++;
      if (visibleIndex === position) {
        return node.id;
      }
    }
    // If position exceeds visible length, return last visible node
    return this.getNodeIdAtPosition(this.getText().length - 1) || "root";
  }
}
