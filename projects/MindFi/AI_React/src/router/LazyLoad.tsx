import {type ReactElement, Suspense} from "react";
import {Spin} from "antd";

export default function LazyLoad(props: { children: ReactElement }): ReactElement {
    return (
        <Suspense
            fallback={
                <Spin
                    size="large"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%"
                    }}
                />
            }
        >
            {props.children}
        </Suspense>
    );
};