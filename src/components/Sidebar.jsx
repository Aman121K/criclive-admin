import React from 'react';

const tabs = [
  {id: 'overview', label: 'Overview'},
  {id: 'users', label: 'Users'},
  {id: 'news', label: 'News'},
];

const Sidebar = ({activeTab, onTabChange, onLogout}) => {
  return (
    <aside className="sidebar">
      <div>
        <p className="eyebrow">Admin Panel</p>
        <h1 className="brand-title">CricLive</h1>
      </div>

      <nav className="menu">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`menu-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}>
            {tab.label}
          </button>
        ))}
      </nav>

      <button type="button" className="logout-btn" onClick={onLogout}>
        Logout
      </button>
    </aside>
  );
};

export default Sidebar;
