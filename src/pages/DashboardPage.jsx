import React, {useEffect, useMemo, useState} from 'react';
import {clearToken, request, uploadNewsImage} from '../api';
import Sidebar from '../components/Sidebar';
import CkEditorCdn from '../components/CkEditorCdn';

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

const stripHtml = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const getSnippet = value => {
  const text = stripHtml(value);
  if (!text) {
    return '-';
  }
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
};

const emptyNewsForm = {
  title: '',
  content: '',
  imageUrl: '',
  thumbnailUrl: '',
  tag: 'MYCRICKET',
  isPublished: true,
};

const DashboardPage = ({token, onLogout}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [news, setNews] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [uploadingInlineImages, setUploadingInlineImages] = useState(false);
  const [savingNews, setSavingNews] = useState(false);
  const [deletingNewsId, setDeletingNewsId] = useState('');
  const [editingNewsId, setEditingNewsId] = useState('');
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);

  const [form, setForm] = useState(emptyNewsForm);

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

  const saveNews = async event => {
    event.preventDefault();
    setError('');

    try {
      const hasExistingImage = Boolean(form.imageUrl);
      const hasExistingThumbnail = Boolean(form.thumbnailUrl);
      const hasImage = Boolean(imageFile || hasExistingImage);
      const hasThumbnail = Boolean(thumbnailFile || hasExistingThumbnail);

      if (!hasImage || !hasThumbnail) {
        setError('Please upload both news image and thumbnail image');
        return;
      }

      setSavingNews(true);
      const payload = new FormData();
      payload.append('title', form.title || '');
      payload.append('content', form.content || '');
      payload.append('tag', form.tag || 'MYCRICKET');
      payload.append('isPublished', String(Boolean(form.isPublished)));
      if (form.imageUrl) {
        payload.append('imageUrl', form.imageUrl);
      }
      if (form.thumbnailUrl) {
        payload.append('thumbnailUrl', form.thumbnailUrl);
      }
      if (imageFile) {
        payload.append('image', imageFile);
      }
      if (thumbnailFile) {
        payload.append('thumbnail', thumbnailFile);
      }

      await request(editingNewsId ? `/api/admin/news/${editingNewsId}` : '/api/admin/news', {
        method: editingNewsId ? 'PATCH' : 'POST',
        token,
        body: payload,
      });

      setForm(emptyNewsForm);
      setEditingNewsId('');
      setImageFile(null);
      setThumbnailFile(null);

      await loadNews();
      setActiveTab('news-list');
    } catch (err) {
      setError(err.message || `Failed to ${editingNewsId ? 'update' : 'create'} news`);
      handleAuthError(err);
    } finally {
      setSavingNews(false);
    }
  };

  const startCreate = () => {
    setEditingNewsId('');
    setForm(emptyNewsForm);
    setImageFile(null);
    setThumbnailFile(null);
    setActiveTab('news-create');
  };

  const startEdit = item => {
    setEditingNewsId(item._id);
    setForm({
      title: item.title || '',
      content: item.content || '',
      imageUrl: item.imageUrl || '',
      thumbnailUrl: item.thumbnailUrl || '',
      tag: item.tag || 'MYCRICKET',
      isPublished: Boolean(item.isPublished),
    });
    setImageFile(null);
    setThumbnailFile(null);
    setActiveTab('news-create');
  };

  const cancelCreatePage = () => {
    setEditingNewsId('');
    setForm(emptyNewsForm);
    setImageFile(null);
    setThumbnailFile(null);
    setActiveTab('news-list');
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

  const deleteNews = async item => {
    const shouldDelete = window.confirm(`Delete "${item.title}"? This cannot be undone.`);
    if (!shouldDelete) {
      return;
    }

    try {
      setDeletingNewsId(item._id);
      setError('');
      await request(`/api/admin/news/${item._id}`, {method: 'DELETE', token});
      if (editingNewsId === item._id) {
        cancelCreatePage();
      }
      await loadNews();
    } catch (err) {
      setError(err.message || 'Failed to delete news');
      handleAuthError(err);
    } finally {
      setDeletingNewsId('');
    }
  };

  const handleInlineImagesUpload = async files => {
    if (!files?.length) {
      return;
    }

    try {
      setUploadingInlineImages(true);
      setError('');

      const uploads = await Promise.all(files.map(file => uploadNewsImage({file, token})));
      const imagesHtml = uploads
        .map(file => file?.url)
        .filter(Boolean)
        .map(url => `<p><img src="${url}" alt="News image" /></p>`)
        .join('');

      if (imagesHtml) {
        setForm(prev => ({...prev, content: `${prev.content || ''}${imagesHtml}`}));
      }
    } catch (err) {
      setError(err.message || 'Failed to upload content images');
      handleAuthError(err);
    } finally {
      setUploadingInlineImages(false);
    }
  };

  const handleInlineImagesInput = async event => {
    const files = Array.from(event.target.files || []);
    await handleInlineImagesUpload(files);
    event.target.value = '';
  };

  return (
    <div className="admin-layout">
      <Sidebar
        activeTab={activeTab}
        onTabChange={tabId => {
          if (tabId === 'news-create' && activeTab !== 'news-create') {
            setEditingNewsId('');
            setForm(emptyNewsForm);
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
                      <th>Title</th>
                      <th>Preview</th>
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
                          <td>{item.title}</td>
                          <td>{getSnippet(item.content || item.summary)}</td>
                          <td>{item.tag || '-'}</td>
                          <td>{item.isPublished ? 'Published' : 'Draft'}</td>
                          <td>{formatDate(item.updatedAt || item.createdAt)}</td>
                          <td>
                            <div className="actionGroup">
                              <button type="button" className="ghost" onClick={() => startEdit(item)}>
                                Edit
                              </button>
                              <button type="button" className="ghost" onClick={() => togglePublish(item)}>
                                {item.isPublished ? 'Unpublish' : 'Publish'}
                              </button>
                              <button
                                type="button"
                                className="ghost dangerBtn"
                                onClick={() => deleteNews(item)}
                                disabled={deletingNewsId === item._id}>
                                {deletingNewsId === item._id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6">No news available.</td>
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
                <button type="button" className="ghost" onClick={cancelCreatePage}>
                  Back to Listing
                </button>
              </div>

              <label>
                <span>Title</span>
                <input value={form.title} onChange={e => setForm(prev => ({...prev, title: e.target.value}))} required />
              </label>

              <label>
                <span>Content (CKEditor)</span>
                <CkEditorCdn
                  value={form.content}
                  onChange={value => setForm(prev => ({...prev, content: value}))}
                  disabled={savingNews}
                />
              </label>
              <label>
                <span>{uploadingInlineImages ? 'Uploading content images...' : 'Upload Content Images (multiple)'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  onChange={handleInlineImagesInput}
                  disabled={uploadingInlineImages || savingNews}
                />
              </label>

              <label>
                <span>
                  Upload News Image {form.imageUrl && !imageFile ? '(current image saved)' : ''}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  onChange={event => setImageFile(event.target.files?.[0] || null)}
                  disabled={uploadingInlineImages || savingNews}
                />
                {imageFile ? <small className="muted">Selected: {imageFile.name}</small> : null}
              </label>
              <label>
                <span>
                  Upload Thumbnail Image {form.thumbnailUrl && !thumbnailFile ? '(current thumbnail saved)' : ''}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  onChange={event => setThumbnailFile(event.target.files?.[0] || null)}
                  disabled={uploadingInlineImages || savingNews}
                />
                {thumbnailFile ? <small className="muted">Selected: {thumbnailFile.name}</small> : null}
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
              <button type="submit" disabled={uploadingInlineImages || savingNews}>
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
