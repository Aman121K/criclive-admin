import React, {useEffect, useMemo, useState} from 'react';
import {clearToken, request, uploadNewsImage} from '../api';
import Sidebar from '../components/Sidebar';

const formatDate = value => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString();
};

const DashboardPage = ({token, onLogout}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [news, setNews] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    summary: '',
    content: '',
    imageUrl: '',
    thumbnailUrl: '',
    tag: 'MYCRICKET',
    isPublished: true,
  });

  const stats = useMemo(() => {
    const publishedCount = news.filter(item => item.isPublished).length;
    return [
      {label: 'Registered Users', value: users.length},
      {label: 'Total News', value: news.length},
      {label: 'Published News', value: publishedCount},
    ];
  }, [news, users.length]);

  const handleAuthError = (err) => {
    if (String(err.message || '').toLowerCase().includes('unauthorized')) {
      clearToken();
      onLogout();
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      setError('');
      const data = await request('/api/admin/users', {token});
      setUsers(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load users');
      handleAuthError(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadNews = async () => {
    try {
      setLoadingNews(true);
      setError('');
      const data = await request('/api/admin/news', {token});
      setNews(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load news');
      handleAuthError(err);
    } finally {
      setLoadingNews(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadNews();
  }, []);

  const handleImageUpload = async (event, field) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError('');

    try {
      if (field === 'imageUrl') {
        setUploadingImage(true);
      } else {
        setUploadingThumbnail(true);
      }

      const data = await uploadNewsImage({file, token});
      setForm(prev => ({...prev, [field]: data.url || ''}));
    } catch (err) {
      setError(err.message || 'Failed to upload image');
      handleAuthError(err);
    } finally {
      if (field === 'imageUrl') {
        setUploadingImage(false);
      } else {
        setUploadingThumbnail(false);
      }
      event.target.value = '';
    }
  };

  const createNews = async event => {
    event.preventDefault();
    setError('');

    try {
      await request('/api/admin/news', {
        method: 'POST',
        token,
        body: form,
      });

      setForm({
        title: '',
        summary: '',
        content: '',
        imageUrl: '',
        thumbnailUrl: '',
        tag: 'MYCRICKET',
        isPublished: true,
      });

      await loadNews();
      setActiveTab('news');
    } catch (err) {
      setError(err.message || 'Failed to create news');
      handleAuthError(err);
    }
  };

  const togglePublish = async item => {
    try {
      await request(`/api/admin/news/${item._id}/publish`, {
        method: 'PATCH',
        token,
        body: {isPublished: !item.isPublished},
      });
      await loadNews();
    } catch (err) {
      setError(err.message || 'Failed to update news');
      handleAuthError(err);
    }
  };

  return (
    <div className="admin-layout">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={() => {
          clearToken();
          onLogout();
        }}
      />

      <main className="content">
        <header className="content-header">
          <h2>{activeTab === 'overview' ? 'Overview' : activeTab === 'users' ? 'Users' : 'News Management'}</h2>
          <div className="toolbar">
            <button type="button" className="ghost" onClick={loadUsers}>
              Refresh Users
            </button>
            <button type="button" className="ghost" onClick={loadNews}>
              Refresh News
            </button>
          </div>
        </header>

        {error ? <p className="error">{error}</p> : null}

        {activeTab === 'overview' ? (
          <section className="stats-grid">
            {stats.map(item => (
              <article key={item.label} className="stat-card">
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </article>
            ))}
          </section>
        ) : null}

        {activeTab === 'users' ? (
          <section className="panel">
            <div className="panel-title-row">
              <h3>Registered Users</h3>
              {loadingUsers ? <span className="muted">Loading...</span> : null}
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Joined</th>
                    <th>Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length ? (
                    users.map(user => (
                      <tr key={user._id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td>{formatDate(user.lastLoginAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === 'news' ? (
          <section className="news-layout">
            <form className="panel stack" onSubmit={createNews}>
              <h3>Create News</h3>
              <label>
                <span>Title</span>
                <input
                  value={form.title}
                  onChange={e => setForm(prev => ({...prev, title: e.target.value}))}
                  required
                />
              </label>
              <label>
                <span>Summary</span>
                <textarea
                  rows="3"
                  value={form.summary}
                  onChange={e => setForm(prev => ({...prev, summary: e.target.value}))}
                  required
                />
              </label>
              <label>
                <span>Content</span>
                <textarea
                  rows="4"
                  value={form.content}
                  onChange={e => setForm(prev => ({...prev, content: e.target.value}))}
                />
              </label>
              <label>
                <span>News Image URL (R2)</span>
                <input
                  value={form.imageUrl}
                  onChange={e => setForm(prev => ({...prev, imageUrl: e.target.value}))}
                  placeholder="https://your-r2-public-domain/.../image.jpg"
                />
              </label>
              <label>
                <span>{uploadingImage ? 'Uploading image...' : 'Upload News Image (to R2)'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  onChange={event => handleImageUpload(event, 'imageUrl')}
                  disabled={uploadingImage || uploadingThumbnail}
                />
              </label>
              <label>
                <span>Thumbnail URL (R2)</span>
                <input
                  value={form.thumbnailUrl}
                  onChange={e => setForm(prev => ({...prev, thumbnailUrl: e.target.value}))}
                  placeholder="https://.../thumbnail.jpg"
                />
              </label>
              <label>
                <span>{uploadingThumbnail ? 'Uploading thumbnail...' : 'Upload Thumbnail (to R2)'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  onChange={event => handleImageUpload(event, 'thumbnailUrl')}
                  disabled={uploadingImage || uploadingThumbnail}
                />
              </label>
              <label>
                <span>Tag</span>
                <input value={form.tag} onChange={e => setForm(prev => ({...prev, tag: e.target.value}))} />
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={e => setForm(prev => ({...prev, isPublished: e.target.checked}))}
                />
                <span>Publish immediately</span>
              </label>
              <button type="submit" disabled={uploadingImage || uploadingThumbnail}>
                {uploadingImage || uploadingThumbnail ? 'Upload in progress...' : 'Publish News'}
              </button>
            </form>

            <article className="panel">
              <div className="panel-title-row">
                <h3>News Library</h3>
                {loadingNews ? <span className="muted">Loading...</span> : null}
              </div>
              <div className="news-list">
                {news.length ? (
                  news.map(item => (
                    <div key={item._id} className="news-item">
                      <div>
                        <p className="news-title">{item.title}</p>
                        <p className="muted">{item.summary}</p>
                        <p className="muted small">Image: {item.imageUrl || '-'}</p>
                        <p className="muted small">Thumbnail: {item.thumbnailUrl || '-'}</p>
                        <p className="muted small">Created {formatDate(item.createdAt)}</p>
                      </div>
                      <button type="button" className="ghost" onClick={() => togglePublish(item)}>
                        {item.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="muted">No news available.</p>
                )}
              </div>
            </article>
          </section>
        ) : null}
      </main>
    </div>
  );
};

export default DashboardPage;
