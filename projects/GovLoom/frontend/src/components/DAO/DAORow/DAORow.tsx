import React from 'react';
import { Link } from 'react-router-dom';
import type { DAO } from '../../../types';
import './style.css';

interface DAORowProps {
  dao: DAO;
}

// 注意: 直接在 <tr> 上使用 <Link> 在技术上不是标准 HTML，但 React 和现代浏览器可以很好地处理。
// 一个更 "纯净" 的方法是创建一个 "可导航的行" 组件，但为了简单起见，这里我们直接修改。

const DAORow: React.FC<DAORowProps> = ({ dao }) => {
  return (
    <tr className="dao-row-component">
      <td className="cell-dao-info">
        <Link to={`/dao/${dao.slug}`} className="dao-row-link"> {/* 使用 Link 包裹内容 */}
          <img src={dao.logoUrl} alt={`${dao.name} logo`} className="dao-logo-row" />
          <div className="dao-text-info">
            <div className="dao-name-row">{dao.name}</div>
            <div className="dao-description-row">{dao.description}</div>
          </div>
        </Link>
      </td>
      <td className="cell-proposals">{dao.proposalCount.toLocaleString()}</td>
      <td className="cell-members">{dao.memberCount}</td>
    </tr>
  );
};

export default DAORow;