import React, { useState, useEffect } from 'react';

interface Viewer {
  id: string;
  username: string;
  display_name?: string;
  is_moderator: boolean;
  is_vip: boolean;
  is_subscriber: boolean;
  is_banned: boolean;
  message_count: number;
  first_seen_at?: string;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
}

type FilterType = 'all' | 'moderators' | 'vips' | 'subscribers' | 'banned';

const Viewers: React.FC = () => {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [filteredViewers, setFilteredViewers] = useState<Viewer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadViewers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [viewers, searchTerm, filter]);

  const loadViewers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await window.api.invoke('db:getViewers');
      setViewers(data || []);
    } catch (err) {
      console.error('Failed to load viewers:', err);
      setError('Failed to load viewers');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...viewers];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v => 
        v.username.toLowerCase().includes(term) ||
        v.display_name?.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(v => {
        switch (filter) {
          case 'moderators': return v.is_moderator;
          case 'vips': return v.is_vip;
          case 'subscribers': return v.is_subscriber;
          case 'banned': return v.is_banned;
          default: return true;
        }
      });
    }

    // Sort by last seen (most recent first)
    filtered.sort((a, b) => {
      if (!a.last_seen_at) return 1;
      if (!b.last_seen_at) return -1;
      return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
    });

    setFilteredViewers(filtered);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getBadges = (viewer: Viewer): string[] => {
    const badges: string[] = [];
    if (viewer.is_moderator) badges.push('MOD');
    if (viewer.is_vip) badges.push('VIP');
    if (viewer.is_subscriber) badges.push('SUB');
    if (viewer.is_banned) badges.push('BANNED');
    return badges;
  };

  const getBadgeClass = (badge: string): string => {
    switch (badge) {
      case 'MOD': return 'badge-mod';
      case 'VIP': return 'badge-vip';
      case 'SUB': return 'badge-sub';
      case 'BANNED': return 'badge-banned';
      default: return 'badge';
    }
  };

  if (loading) {
    return (
      <div className="viewers-container">
        <div className="loading">Loading viewers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="viewers-container">
        <div className="error">{error}</div>
        <button onClick={loadViewers}>Retry</button>
      </div>
    );
  }

  return (
    <div className="viewers-container">
      <div className="viewers-header">
        <h1>Viewers</h1>
        <button className="refresh-btn" onClick={loadViewers}>
          🔄 Refresh
        </button>
      </div>

      <div className="viewers-controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search by username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All ({viewers.length})
          </button>
          <button 
            className={filter === 'moderators' ? 'active' : ''}
            onClick={() => setFilter('moderators')}
          >
            Moderators ({viewers.filter(v => v.is_moderator).length})
          </button>
          <button 
            className={filter === 'vips' ? 'active' : ''}
            onClick={() => setFilter('vips')}
          >
            VIPs ({viewers.filter(v => v.is_vip).length})
          </button>
          <button 
            className={filter === 'subscribers' ? 'active' : ''}
            onClick={() => setFilter('subscribers')}
          >
            Subscribers ({viewers.filter(v => v.is_subscriber).length})
          </button>
          <button 
            className={filter === 'banned' ? 'active' : ''}
            onClick={() => setFilter('banned')}
          >
            Banned ({viewers.filter(v => v.is_banned).length})
          </button>
        </div>
      </div>

      <div className="viewers-stats">
        Showing {filteredViewers.length} of {viewers.length} viewers
      </div>

      <div className="viewers-table-container">
        <table className="viewers-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Badges</th>
              <th>Messages</th>
              <th>First Seen</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {filteredViewers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  No viewers found
                </td>
              </tr>
            ) : (
              filteredViewers.map(viewer => (
                <tr key={viewer.id}>
                  <td>
                    <div className="viewer-name">
                      <span className="display-name">
                        {viewer.display_name || viewer.username}
                      </span>
                      {viewer.display_name && viewer.display_name.toLowerCase() !== viewer.username && (
                        <span className="username-small">({viewer.username})</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="badges">
                      {getBadges(viewer).map(badge => (
                        <span key={badge} className={`badge ${getBadgeClass(badge)}`}>
                          {badge}
                        </span>
                      ))}
                      {getBadges(viewer).length === 0 && (
                        <span className="no-badges">—</span>
                      )}
                    </div>
                  </td>
                  <td className="message-count">
                    {viewer.message_count.toLocaleString()}
                  </td>
                  <td className="date-cell">
                    {formatDate(viewer.first_seen_at)}
                  </td>
                  <td className="date-cell">
                    {formatDate(viewer.last_seen_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .viewers-container {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          background-color: #1a1a1a;
          min-height: 100vh;
        }

        .viewers-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .viewers-header h1 {
          margin: 0;
          font-size: 2rem;
          color: #fff;
        }

        .refresh-btn {
          padding: 0.5rem 1rem;
          background: #9147ff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }

        .refresh-btn:hover {
          background: #7c3aed;
        }

        .viewers-controls {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .search-input {
          padding: 0.75rem;
          font-size: 1rem;
          border: 1px solid #444;
          border-radius: 4px;
          width: 100%;
          max-width: 400px;
          background: #2a2a2a;
          color: #fff;
        }

        .filter-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .filter-buttons button {
          padding: 0.5rem 1rem;
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          color: #fff;
        }

        .filter-buttons button:hover {
          background: #3a3a3a;
        }

        .filter-buttons button.active {
          background: #9147ff;
          color: white;
          border-color: #9147ff;
        }

        .viewers-stats {
          margin-bottom: 1rem;
          color: #aaa;
          font-size: 0.9rem;
        }

        .viewers-table-container {
          overflow-x: auto;
          border: 1px solid #444;
          border-radius: 8px;
          background: #2a2a2a;
        }

        .viewers-table {
          width: 100%;
          border-collapse: collapse;
          background: #2a2a2a;
          color: #fff;
        }

        .viewers-table thead {
          background: #1a1a1a;
        }

        .viewers-table th {
          text-align: left;
          padding: 1rem;
          font-weight: 600;
          border-bottom: 2px solid #444;
          color: #fff;
        }

        .viewers-table td {
          padding: 1rem;
          border-bottom: 1px solid #333;
          color: #fff;
        }

        .viewers-table tbody tr:hover {
          background: #333;
        }

        .viewer-name {
          display: flex;
          flex-direction: column;
        }

        .display-name {
          font-weight: 500;
        }

        .username-small {
          font-size: 0.85rem;
          color: #999;
        }

        .badges {
          display: flex;
          gap: 0.25rem;
          flex-wrap: wrap;
        }

        .badge {
          padding: 0.25rem 0.5rem;
          border-radius: 3px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .badge-mod {
          background: #00ad03;
          color: white;
        }

        .badge-vip {
          background: #e005b9;
          color: white;
        }

        .badge-sub {
          background: #9147ff;
          color: white;
        }

        .badge-banned {
          background: #dc2626;
          color: white;
        }

        .no-badges {
          color: #999;
        }

        .message-count {
          font-weight: 500;
        }

        .date-cell {
          color: #aaa;
          font-size: 0.9rem;
        }

        .loading, .error {
          text-align: center;
          padding: 3rem;
          font-size: 1.2rem;
          color: #aaa;
        }

        .error {
          color: #dc2626;
        }
      `}</style>
    </div>
  );
};

export default Viewers;
