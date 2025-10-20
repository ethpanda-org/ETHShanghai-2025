
import LazyLoad from "@/router/LazyLoad.tsx";

import Router from "@/router/Router.tsx";
export default function App() {

    return (
        <LazyLoad>
            <Router></Router>
        </LazyLoad>
    );
}
