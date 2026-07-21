import logging
from datetime import UTC, datetime

logger = logging.getLogger(__name__)


class WorkflowEngine:
    def __init__(self):
        pass

    async def parse_diagram(self, diagram_data: dict) -> dict:
        """Parser: diagram_data JSON -> grafo de nodos ejecutables"""
        nodes = {}
        edges = []

        # Native EASYDOC editor format. Keep the legacy JointJS parser below
        # so existing development data remains usable.
        if "nodes" in diagram_data:
            for node in diagram_data.get("nodes", []):
                nodes[node.get("id")] = {
                    "id": node.get("id"),
                    "type": node.get("type", "activity"),
                    "name": node.get("label", "Node"),
                    "assigned_to": node.get("assignee"),
                    "department": node.get("department"),
                }

            for edge in diagram_data.get("edges", []):
                edges.append(
                    {
                        "id": edge.get("id"),
                        "source": edge.get("from"),
                        "target": edge.get("to"),
                        "condition": edge.get("label", ""),
                    }
                )

            start_nodes = [
                node_id for node_id, node in nodes.items() if node.get("type") == "start"
            ]
            return {
                "nodes": nodes,
                "edges": edges,
                "start_node_id": start_nodes[0] if start_nodes else None,
            }

        # Legacy JointJS/mxGraph format.
        cells = diagram_data.get("cells", [])
        for cell in cells:
            if cell.get("type") == "link" or "source" in cell:
                edges.append(
                    {
                        "id": cell.get("id"),
                        "source": cell.get("source", {}).get("id"),
                        "target": cell.get("target", {}).get("id"),
                        "condition": cell.get("labels", [{}])[0]
                        .get("attrs", {})
                        .get("text", {})
                        .get("text", "")
                        if cell.get("labels")
                        else "",
                    }
                )
            else:
                nodes[cell.get("id")] = {
                    "id": cell.get("id"),
                    "type": cell.get("type", "standard.Rectangle"),
                    "name": cell.get("attrs", {}).get("label", {}).get("text", "Node"),
                    "assigned_to": cell.get("assigned_to"),  # custom property
                    "action": cell.get("action"),  # custom property
                }

        # Find start node
        start_nodes = [n_id for n_id, n in nodes.items() if n.get("type") == "standard.Circle"]
        start_node_id = start_nodes[0] if start_nodes else None

        return {"nodes": nodes, "edges": edges, "start_node_id": start_node_id}

    async def start_instance(
        self, policy_id: str, diagram_graph: dict, started_by: str, context: dict = None
    ) -> dict:
        """Inicia una instancia de workflow basada en el diagrama"""
        start_node_id = diagram_graph.get("start_node_id")

        if not start_node_id:
            logger.warning(f"Workflow para policy {policy_id} no tiene nodo de inicio")
            return None

        instance = {
            "policy_id": policy_id,
            "status": "in_progress",
            "current_node_id": start_node_id,
            "started_by": started_by,
            "context": context or {},
            "history": [
                {
                    "node_id": start_node_id,
                    "action": "started",
                    "timestamp": datetime.now(UTC).isoformat(),
                    "actor": started_by,
                }
            ],
        }

        # In a real app, save to MongoDB
        return instance

    async def advance(
        self, instance: dict, diagram_graph: dict, action_data: dict, actor: str
    ) -> dict:
        """Avanza la instancia al siguiente nodo evaluando condiciones"""
        current_node_id = instance.get("current_node_id")

        # Find outgoing edges
        edges = diagram_graph.get("edges", [])
        outgoing_edges = [e for e in edges if e.get("source") == current_node_id]

        next_node_id = None

        if not outgoing_edges:
            # End of workflow
            instance["status"] = "completed"
        elif len(outgoing_edges) == 1:
            next_node_id = outgoing_edges[0].get("target")
        else:
            # Evaluate conditions
            for edge in outgoing_edges:
                condition = edge.get("condition", "").lower()
                action_value = action_data.get("decision", "").lower()

                # Very simple evaluation
                if condition and action_value and condition == action_value:
                    next_node_id = edge.get("target")
                    break

            if not next_node_id:
                # Fallback to first if no condition matched
                next_node_id = outgoing_edges[0].get("target")

        if next_node_id:
            instance["current_node_id"] = next_node_id
            nodes = diagram_graph.get("nodes", {})
            next_node = nodes.get(next_node_id, {})

            # Check if it's an end node
            if next_node.get("type") == "end" or (
                next_node.get("type") == "standard.Circle"
                and "end" in next_node.get("name", "").lower()
            ):
                instance["status"] = "completed"

        # Record history
        instance["history"].append(
            {
                "node_id": next_node_id or current_node_id,
                "action": action_data.get("action", "advanced"),
                "timestamp": datetime.now(UTC).isoformat(),
                "actor": actor,
            }
        )

        return instance
