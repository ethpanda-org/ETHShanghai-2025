import LayoutView from "@/views/LayoutView.tsx"
import TestView from "@/views/TestView.tsx";
import WelcomeView from "@/views/WelcomeView.tsx";
import {lazy} from "react";
import {Navigate, type NonIndexRouteObject, useRoutes} from "react-router-dom";


const routes: NonIndexRouteObject[] = [
    {
        path: '/',
        element: <WelcomeView/>
    },
    // {
    //     path: '/test',
    //     element: <TestView/>
    // },
    {
        path: "*",
        Component: lazy(() => import("@/views/TipPage/404"))
    },
    {
        path: "/test",
        Component: lazy(() => import("@/components/StakingWagmi.tsx"))
    },
    {
        path: "/deposit",
        Component: lazy(() => import("@/components/test/StakingComponent.tsx"))
    },
    {
        path: '/app',
        element: <LayoutView/>,
        children: [
            {
                index: true,
                element: <Navigate to="/app/hub" />,
            },
            {
                path: "hub",
                Component: lazy(() => import("@/components/McpHub.tsx"))
            },
            {
                path: "my",
                Component: lazy(() => import("@/components/MyProject.tsx"))
            },
        ]
    },
]
const Router = () => {
    return useRoutes(routes);
};
export default Router
