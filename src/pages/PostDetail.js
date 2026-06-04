import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import {
  getPostById,
  getFollowing,
  getLikedPostIds,
  getRepostedOriginalIds,
  getRepostCountsByPost,
  getCommentCountsByPost,
  follow,
  unfollow,
  createNotification,
} from '../lib/sdb';
import PostCard from '../components/PostCard';
import { LoadingBlock, ErrorBlock } from '../components/ui/States';

export default function PostDetail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { postId } = useParams();
  const [searchParams] = useSearchParams();
  const highlightCommentId = searchParams.get('comment') || null;

  const [post, setPost] = useState(null);
  const [followingSet, setFollowingSet] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!postId || !user?.id) return;
    setLoading(true);
    setError(null);
    const [{ data: row, error: postErr }, { data: followsIds }, { data: likedIds }, { data: repostedIds }] =
      await Promise.all([
        getPostById(postId),
        getFollowing(user.id),
        getLikedPostIds(user.id),
        getRepostedOriginalIds(user.id),
      ]);
    if (postErr || !row) {
      setError(postErr || new Error('Post not found.'));
      setLoading(false);
      return;
    }
    const [{ data: repostCounts }, { data: commentCounts }] = await Promise.all([
      getRepostCountsByPost([row.id]),
      getCommentCountsByPost([row.id]),
    ]);
    setPost({
      ...row,
      feed_id: row.id,
      reposts: repostCounts[row.id] || 0,
      comments: commentCounts[row.id] || 0,
      currentUserLiked: (likedIds || []).includes(row.id),
      currentUserReposted: (repostedIds || []).includes(row.id),
    });
    setFollowingSet(new Set(followsIds || []));
    setLoading(false);
  }, [postId, user?.id]);

  useEffect(() => { load(); }, [load]);

  async function toggleFollow(targetId) {
    if (!user || targetId === user.id) return;
    const isFollowing = followingSet.has(targetId);
    if (isFollowing) {
      await unfollow(user.id, targetId);
      setFollowingSet((prev) => {
        const n = new Set(prev);
        n.delete(targetId);
        return n;
      });
    } else {
      await follow(user.id, targetId);
      setFollowingSet((prev) => {
        const n = new Set(prev);
        n.add(targetId);
        return n;
      });
      createNotification({ user_id: targetId, actor_id: user.id, type: 'follow' });
    }
  }

  return (
    <div className="-mx-4">
      <div className="px-4 py-3 sticky top-[57px] z-10 bg-bg/85 backdrop-blur border-b border-border flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-[13px] text-zinc-400 hover:text-orange hover:underline"
        >
          <ChevronLeft size={14} /> Back
        </button>
        <span className="text-[14px] font-semibold">Post</span>
      </div>
      {loading ? (
        <LoadingBlock label="Loading post…" />
      ) : error ? (
        <div className="mx-4"><ErrorBlock error={error} onRetry={load} /></div>
      ) : post ? (
        <PostCard
          post={post}
          isFollowing={followingSet.has(post.user_id)}
          onToggleFollow={toggleFollow}
          forceOpenComments
          highlightCommentId={highlightCommentId}
        />
      ) : null}
    </div>
  );
}
