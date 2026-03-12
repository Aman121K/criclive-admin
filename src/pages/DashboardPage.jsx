import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {clearToken, request} from '../api';
import ConfirmModal from '../components/ConfirmModal';
import Sidebar from '../components/Sidebar';
import ToastStack from '../components/ToastStack';

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

const getSnippet = value => {
  const text = String(value || '').trim();
  if (!text) {
    return '-';
  }
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
};

const emptyNewsForm = {
  title: '',
  summary: '',
  series: '',
  tag: 'MYCRICKET',
  isPublished: true,
  thumbnailUrl: '',
};

const DashboardPage = ({token, onLogout}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [news, setNews] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [savingNews, setSavingNews] = useState(false);
  const [publishingNewsId, setPublishingNewsId] = useState('');
  const [deletingNewsId, setDeletingNewsId] = useState('');
  const [editingNewsId, setEditingNewsId] = useState('');

  const [seriesOptions, setSeriesOptions] = useState([]);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [confirmDeleteItem, setConfirmDeleteItem] = useState(null);

  const [form, setForm] = useState(emptyNewsForm);
  const [toasts, setToasts] = useState([]);

  const pushToast = (message, type = 'info') => {
    setToasts(prev => [...prev, {id: `${Date.now()}-${Math.random()}`, message, type}]);
  };

  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const stats = useMemo(() => {
    const publishedCount = news.filter(item => item.isPublished).length;
    return [
      {label: 'Registered Users', value: users.length},
      {label: 'Total News', value: news.length},
      {label: 'Published News', value: publishedCount},
    ];
  }, [news, users.length]);

  const handleAuthError = err => {
    if (String(err.message || '').toLowerCase().includes('unauthorized')) {
      clearToken();
      onLogout();
    }
  };

  const loadUsers = async (silent = false) => {
    try {
      setLoadingUsers(true);
      const data = await request('/api/admin/users', {token});
      setUsers(data.items || []);
      if (!silent) {
        pushToast('Users refreshed', 'success');
      }
    } catch (err) {
      pushToast(err.message || 'Failed to load users', 'error');
      handleAuthError(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadNews = async (silent = false) => {
    try {
      setLoadingNews(true);
      const data = await request('/api/admin/news', {token});
      setNews(data.items || []);
      if (!silent) {
        pushToast('News refreshed', 'success');
      }
    } catch (err) {
      pushToast(err.message || 'Failed to load news', 'error');
      handleAuthError(err);
    } finally {
      setLoadingNews(false);
    }
  };

  const loadSeriesOptions = async () => {
    try {
      const data = await request('/api/admin/news/series-options', {token});
      setSeriesOptions(Array.isArray(data.items) ? data.items : []);
    } catch {
      setSeriesOptions([]);
    }
  };

  useEffect(() => {
    loadUsers(true);
    loadNews(true);
    loadSeriesOptions();
  }, []);

  useEffect(() => {
    return () => {
      if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  const resetForm = () => {
    setEditingNewsId('');
    setForm(emptyNewsForm);
    setThumbnailFile(null);
    setThumbnailPreview('');
  };

  const saveNews = async event => {
    event.preventDefault();

    const normalizedTitle = String(form.title || '').trim();
    const normalizedSummary = String(form.summary || '').trim();
    const normalizedSeries = String(form.series || '').trim();

    if (!normalizedTitle) {
      pushToast('Title is required', 'error');
      return;
    }

    if (!normalizedSummary) {
      pushToast('Summary is required', 'error');
      return;
    }

    if (!normalizedSeries) {
      pushToast('Series is required', 'error');
      return;
    }

    if (!thumbnailFile && !form.thumbnailUrl) {
      pushToast('Thumbnail is required', 'error');
      return;
    }

    try {
      setSavingNews(true);
      const payload = new FormData();
      payload.append('title', normalizedTitle);
      payload.append('summary', normalizedSummary);
      payload.append('series', normalizedSeries);
      payload.append('tag', String(form.tag || 'MYCRICKET').trim() || 'MYCRICKET');
      payload.append('isPublished', String(Boolean(form.isPublished)));

      if (form.thumbnailUrl) {
        payload.append('thumbnailUrl', form.thumbnailUrl);
      }
      if (thumbnailFile) {
        payload.append('thumbnail', thumbnailFile);
      }

      await request(editingNewsId ? `/api/admin/news/${editingNewsId}` : '/api/admin/news', {
        method: editingNewsId ? 'PATCH' : 'POST',
        token,
        body: payload,
      });

      pushToast(editingNewsId ? 'News updated successfully' : 'News published successfully', 'success');
      resetForm();
      await Promise.all([loadNews(true), loadSeriesOptions()]);
      setActiveTab('news-list');
    } catch (err) {
      pushToast(err.message || `Failed to ${editingNewsId ? 'update' : 'create'} news`, 'error');
      handleAuthError(err);
    } finally {
      setSavingNews(false);
    }
  };

  const startCreate = () => {
    resetForm();
    setActiveTab('news-create');
  };

  const startEdit = item => {
    setEditingNewsId(item._id);
    setForm({
      title: item.title || '',
      summary: item.summary || '',
      series: item.series || '',
      tag: item.tag || 'MYCRICKET',
      isPublished: Boolean(item.isPublished),
      thumbnailUrl: item.thumbnailUrl || '',
    });
    setThumbnailFile(null);
    setThumbnailPreview(item.thumbnailUrl || '');
    setActiveTab('news-create');
  };

  const cancelCreatePage = () => {
    resetForm();
    setActiveTab('news-list');
  };

  const togglePublish = async item => {
    try {
      setPublishingNewsId(item._id);
      await request(`/api/admin/news/${item._id}/publish`, {
        method: 'PATCH',
        token,
        body: {isPublished: !item.isPublished},
      });
      await loadNews(true);
      pushToast(item.isPublished ? 'News moved to draft' : 'News published', 'success');
    } catch (err) {
      pushToast(err.message || 'Failed to update news', 'error');
      handleAuthError(err);
    } finally {
      setPublishingNewsId('');
    }
  };

  const askDeleteNews = item => {
    setConfirmDeleteItem(item);
  };

  const confirmDeleteNews = async () => {
    if (!confirmDeleteItem?._id) {
      return;
    }

    try {
      setDeletingNewsId(confirmDeleteItem._id);
      await request(`/api/admin/news/${confirmDeleteItem._id}`, {method: 'DELETE', token});
      pushToast('News deleted successfully', 'success');
      if (editingNewsId === confirmDeleteItem._id) {
        cancelCreatePage();
      }
      setConfirmDeleteItem(null);
      await Promise.all([loadNews(true), loadSeriesOptions()]);
    } catch (err) {
      pushToast(err.message || 'Failed to delete news', 'error');
      handleAuthError(err);
    } finally {
      setDeletingNewsId('');
    }
  };

  const onThumbnailChange = event => {
    const file = event.target.files?.[0] || null;
    setThumbnailFile(file);

    if (!file) {
      setThumbnailPreview(form.thumbnailUrl || '');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setThumbnailPreview(previewUrl);
  };

  return (
    <div className="admin-layout">
      <ToastStack toasts={toasts} onRemove={removeToast} />
      <ConfirmModal
        open={Boolean(confirmDeleteItem)}
        title="Delete News"
        message={confirmDeleteItem ? `Delete \"${confirmDeleteItem.title}\"? This action cannot be undone.` : ''}
        confirmText="Delete"
        loading={Boolean(deletingNewsId)}
        onConfirm={confirmDeleteNews}
        onCancel={() => setConfirmDeleteItem(null)}
      />

      <Sidebar
        activeTab={activeTab}
        onTabChange={tabId => {
          if (tabId === 'news-create' && activeTab !== 'news-create') {
            resetForm();
          }
          setActiveTab(tabId);
        }}
        onLogout={() => {
          clearToken();
          onLogout();
        }}
      />

      <main className="content">
        <header className="content-header">
          <div>
            <p className="eyebrow">Control Center</p>
            <h2>
              {activeTab === 'overview'
                ? 'Overview'
                : activeTab === 'users'
                  ? 'Users'
                  : activeTab === 'news-list'
                    ? 'News Listing'
                    : editingNewsId
                      ? 'Edit News'
                      : 'Create News'}
            </h2>
          </div>
          <div className="toolbar">
            <button type="button" className="ghost" onClick={() => loadUsers(false)} disabled={loadingUsers}>
              {loadingUsers ? 'Refreshing Users...' : 'Refresh Users'}
            </button>
            <button type="button" className="ghost" onClick={() => loadNews(false)} disabled={loadingNews}>
              {loadingNews ? 'Refreshing News...' : 'Refresh News'}
            </button>
          </div>
        </header>

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

        {activeTab === 'news-list' ? (
          <section className="news-management">
            <article className="panel">
              <div className="panel-title-row">
                <h3>News Listing</h3>
                <div className="toolbar">
                  <button type="button" onClick={startCreate}>
                    + Create News
                  </button>
                </div>
              </div>

              <div className="table-wrap newsTableWrap">
                <table className="newsTable">
                  <thead>
                    <tr>
                      <th>Thumbnail</th>
                      <th>Title</th>
                      <th>Summary</th>
                      <th>Series</th>
                      <th>Tag</th>
                      <th>Status</th>
                      <th>Updated</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {news.length ? (
                      news.map(item => (
                        <tr key={item._id}>
                          <td>
                            {item.thumbnailUrl ? (
                              <img src={item.thumbnailUrl} alt={item.title} className="newsThumbMini" />
                            ) : (
                              <span className="muted">-</span>
                            )}
                          </td>
                          <td>{item.title}</td>
                          <td>{getSnippet(item.summary)}</td>
                          <td>{item.series || 'General'}</td>
                          <td>{item.tag || '-'}</td>
                          <td>
                            <span className={`statusPill ${item.isPublished ? 'published' : 'draft'}`}>
                              {item.isPublished ? 'Published' : 'Draft'}
                            </span>
                          </td>
                          <td>{formatDate(item.updatedAt || item.createdAt)}</td>
                          <td>
                            <div className="actionGroup">
                              <button type="button" className="ghost" onClick={() => startEdit(item)}>
                                Edit
                              </button>
                              <button
                                type="button"
                                className="ghost"
                                onClick={() => togglePublish(item)}
                                disabled={publishingNewsId === item._id || Boolean(deletingNewsId)}>
                                {publishingNewsId === item._id
                                  ? 'Updating...'
                                  : item.isPublished
                                    ? 'Unpublish'
                                    : 'Publish'}
                              </button>
                              <button
                                type="button"
                                className="ghost dangerBtn"
                                onClick={() => askDeleteNews(item)}
                                disabled={deletingNewsId === item._id || publishingNewsId === item._id}>
                                {deletingNewsId === item._id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8">No news available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {loadingNews ? <p className="muted small">Loading news...</p> : null}
            </article>
          </section>
        ) : null}

        {activeTab === 'news-create' ? (
          <section className="news-management">
            <form className="panel stack" onSubmit={saveNews}>
              <div className="panel-title-row">
                <h3>{editingNewsId ? 'Edit News' : 'Create News'}</h3>
                <button type="button" className="ghost" onClick={cancelCreatePage} disabled={savingNews}>
                  Back to Listing
                </button>
              </div>

              <label>
                <span>Title</span>
                <input value={form.title} onChange={e => setForm(prev => ({...prev, title: e.target.value}))} required />
              </label>

              <label>
                <span>Summary</span>
                <textarea
                  rows={4}
                  value={form.summary}
                  onChange={e => setForm(prev => ({...prev, summary: e.target.value}))}
                  placeholder="Short summary for listing and series card"
                  required
                />
              </label>

              <label>
                <span>Series</span>
                <input
                  value={form.series}
                  onChange={e => setForm(prev => ({...prev, series: e.target.value}))}
                  list="series-options"
                  placeholder="e.g. IPL 2026"
                  required
                />
                <datalist id="series-options">
                  {seriesOptions.map(option => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </label>

              <label>
                <span>Tag</span>
                <input value={form.tag} onChange={e => setForm(prev => ({...prev, tag: e.target.value}))} />
              </label>

              <label>
                <span>Thumbnail</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  onChange={onThumbnailChange}
                  disabled={savingNews}
                />
                {thumbnailPreview ? <img src={thumbnailPreview} alt="Thumbnail preview" className="thumbnailPreview" /> : null}
              </label>

              <label className="check">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={e => setForm(prev => ({...prev, isPublished: e.target.checked}))}
                />
                <span>Publish immediately</span>
              </label>
              <button type="submit" disabled={savingNews}>
                {savingNews ? 'Saving...' : editingNewsId ? 'Update News' : 'Publish News'}
              </button>
            </form>
          </section>
        ) : null}
      </main>
    </div>
  );
};

export default DashboardPage;
