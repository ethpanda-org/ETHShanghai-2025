// src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from './App.tsx';
import TallyHomepage from './pages/Home';
import ExplorePage from './pages/Explore';
import DAOHomepage from './pages/DAOHome';
import ProposalPage from './pages/Proposal'; // 引入新的提案页面
import NewProposalFlowPage from './pages/NewProposalFlow';
import { Web3ModalProvider } from './components/Wallet';

import './index.css';

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      children: [
        {
          index: true,
          element: <TallyHomepage />,
        },
        {
          path: "explore",
          element: <ExplorePage />
        },
        {
          path: "dao/:slug",
          element: <DAOHomepage />
        },
        {
          path: "dao/:slug/new-proposal",
          element: <NewProposalFlowPage />
        },
        {
          path: "dao/:slug/proposal/:proposalId", // 新增：提案详情页路由
          element: <ProposalPage />
        },
      ]
    },
  ],
  {
    future: {
      v7_normalizeFormMethod: true, 
    },
  }
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Web3ModalProvider>
      <RouterProvider router={router} />
    </Web3ModalProvider>
  </React.StrictMode>,
);
