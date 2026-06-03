import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { createPost } from '../lib/sdb';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { Toast } from '../components/ui/States';

export default function Create() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!body.trim() || !user) return;
    setBusy(true);
    setError('');
    const { error } = await createPost({ user_id: user.id, content: body.trim() });
    setBusy(false);
    if (error) return setError(error.message || 'Could not post.');
    navigate('/home');
  }

  if (!user) return null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar name={user.full_name || user.username || '?'} />
        <div>
          <div className="text-sm font-bold">{user.full_name || user.username}</div>
          <div className="text-xs text-muted font-normal">@{user.username}</div>
        </div>
      </div>

      <Textarea
        rows={6}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What's the work today?"
        className="text-base min-h-[140px]"
      />

      {error ? <Toast>{error}</Toast> : null}

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={!body.trim() || busy}>
          {busy ? 'Posting…' : 'Post'}
        </Button>
      </div>

      <p className="text-center text-[12px] text-muted font-normal">
        Posts are public to anyone on Strove.
      </p>
    </form>
  );
}
