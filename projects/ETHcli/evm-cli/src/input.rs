use crossterm::event::{self, Event, KeyCode, KeyModifiers};
use crate::app::App;

// 返回 bool 表示是否继续运行
pub fn handle_input(app: &mut App) -> anyhow::Result<(bool, Option<String>)> {
    if event::poll(std::time::Duration::from_millis(100))? {
        if let Event::Key(key) = event::read()? {
            // Ctrl+C 退出
            if key.code == KeyCode::Char('c') && key.modifiers == KeyModifiers::CONTROL {
                return Ok((false, None));
            }

            match key.code {
                KeyCode::Char(c) => {
                    app.input.push(c);
                    app.update_suggestion();
                }
                KeyCode::Backspace => {
                    app.input.pop();
                    app.update_suggestion();
                }
                KeyCode::Enter => {
                    if app.input.trim() == "/quit" {
                        return Ok((false, None));
                    }
                    let msg = app.input.clone();
                    app.input.clear();
                    app.update_suggestion();
                    return Ok((true, Some(msg)));
                }
                KeyCode::Tab => {
                    if !app.suggestion.is_empty() {
                        app.accept_suggestion();
                        app.update_suggestion();
                    }
                }
                KeyCode::Up => {
                    app.scroll = app.scroll.saturating_sub(1);
                }
                KeyCode::Down => {
                    app.scroll = app.scroll.saturating_add(1);
                }
                _ => {}
            }
        }
    }
    app.update_suggestion();
    Ok((true, None))
}

