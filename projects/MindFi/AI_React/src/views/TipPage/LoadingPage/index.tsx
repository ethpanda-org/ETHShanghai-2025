import {Spin} from "antd";

export default function LoadingPage() {
    return (
        <Spin
            size="large"
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%"
            }}
        />
    )
}