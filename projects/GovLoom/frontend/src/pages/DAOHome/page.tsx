import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { daoData } from '../../data/daos';
import { DAOHeader } from '../../components/DAOHome';
import { AboutPanel } from '../../components/DAOHome';
import { ProposalList } from '../../components/DAOHome';
import './style.css';

const DAOHomepage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const dao = daoData.find(d => d.slug === slug);

  if (!dao) {
    return (
      <div className="dao-not-found">
        <h1>DAO not found</h1>
        <Link to="/explore">Go back to Explore</Link>
      </div>
    );
  }

  return (
    <div className="dao-homepage-container">
      {/* 新增: 顶部导航栏 */}
      <nav className="dao-homepage-topnav">
        <Link to="/explore" className="topnav-back-link">
          &larr; Explore
        </Link>
        {/* 你可以在这里添加其他全局链接 */}
      </nav>

      {/* DAO 头部和主体内容 */}
      <div className="dao-content-wrapper">
        <DAOHeader dao={dao} />
        <div className="dao-homepage-body">
          <main className="main-content">
            <ProposalList proposals={dao.proposals} daoSlug={dao.slug} />
          </main>
          <aside className="sidebar-content">
            <AboutPanel description={dao.longDescription} />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default DAOHomepage;