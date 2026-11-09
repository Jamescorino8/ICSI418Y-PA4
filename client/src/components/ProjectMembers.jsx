import { useState } from "react";

function ProjectMembers({ projects, users, onMembersChange }) {
    const [projectId, setProjectId] = useState("");
    const [members, setMembers] = useState([]);
    const [userId, setUserId] = useState("");
    const [message, setMessage] = useState("");

    const project = projects.find((project) => project._id === projectId);

    function getUsername(id) {
        const user = users.find((user) => user._id === id);
        return user ? user.username : "Unknown user";
    }

    // fetch the membership documents for a project and store them in state
    async function loadMembers(id) {
        try {
            const response = await fetch(`http://localhost:9000/api/projects/${id}/members`);
            const data = await response.json();
            if (response.ok) {
                setMembers(data);
            } else {
                setMembers([]);
                setMessage(data.message);
            }
        } catch (error) {
            setMessage("Could not connect to the server");
        }
    }

    function handleSelectProject(event) {
        setProjectId(event.target.value);
        setMembers([]);
        setMessage("");
        if (event.target.value) {
            loadMembers(event.target.value);
        }
    }

    async function handleAdd(event) {
        event.preventDefault();

        try {
            const response = await fetch(
                `http://localhost:9000/api/projects/${projectId}/members`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        user_id: userId
                    })
                }
            );
            const data = await response.json();
            setMessage(data.message);
            if (response.ok) {
                loadMembers(projectId);
                onMembersChange();
            }
        } catch (error) {
            setMessage("Could not connect to the server");
        }
    }

    async function handleRemove(memberId) {
        try {
            const response = await fetch(
                `http://localhost:9000/api/projects/${projectId}/members/${memberId}`,
                {
                    method: "DELETE"
                }
            );
            const data = await response.json();
            setMessage(data.message);
            if (response.ok) {
                loadMembers(projectId);
                onMembersChange();
            }
        } catch (error) {
            setMessage("Could not connect to the server");
        }
    }

    return (
        <div>
            <h2>Manage Project Members</h2>
            <select value={projectId} onChange={handleSelectProject}>
                <option value="">Select Project</option>
                {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                        {project.name}
                    </option>
                ))}
            </select>

            {project && (
                <>
                    <ul>
                        {members.map((member) => (
                            <li key={member._id}>
                                {getUsername(member.user_id)}
                                {/* the Project Lead has no Remove button */}
                                {member.user_id === project.project_lead_id ? (
                                    " (Project Lead)"
                                ) : (
                                    <button onClick={() => handleRemove(member.user_id)}>Remove</button>
                                )}
                            </li>
                        ))}
                    </ul>
                    <form onSubmit={handleAdd}>
                        <select value={userId} onChange={(event) => setUserId(event.target.value)}>
                            <option value="">Select User</option>
                            {users.map((user) => (
                                <option key={user._id} value={user._id}>
                                    {user.username}
                                </option>
                            ))}
                        </select>
                        <button type="submit">Add Member</button>
                    </form>
                </>
            )}
            {message && <p>{message}</p>}
        </div>
    );
}

export default ProjectMembers;
