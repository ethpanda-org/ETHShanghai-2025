use agent::{agent_service_client::AgentServiceClient, ChatRequest};
use tokio::sync::mpsc;

pub mod agent {
    tonic::include_proto!("agent");
}

pub async fn send_chat(
    mut client: AgentServiceClient<tonic::transport::Channel>,
    msg: String,
    tx: mpsc::Sender<String>,
) {
    let request = tonic::Request::new(ChatRequest { message: msg });
    if let Ok(resp) = client.chat(request).await {
        let mut stream = resp.into_inner();
        while let Ok(Some(chunk)) = stream.message().await {
            if !chunk.content.is_empty() {
                let _ = tx.send(chunk.content).await;
            }
        }
    }
}

