-- İlan üzerinden gelen mesajların atanmış danışmana düşmesi için (contact_messages.agent_id)
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES agents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contact_messages_agent_id ON contact_messages(agent_id);
