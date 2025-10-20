use crate::error::ContractGeneratorError;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};

/// Dependency manager for contract relationships
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencyManager {
    /// Dependency graph: contract -> dependencies
    dependencies: HashMap<String, Vec<String>>,
    /// Reverse dependency graph: contract -> dependents
    dependents: HashMap<String, Vec<String>>,
}

/// Deployment order result
#[derive(Debug, Clone)]
pub struct DeploymentOrder {
    /// Ordered list of contracts to deploy
    pub order: Vec<String>,
    /// Deployment levels (contracts at same level can be deployed in parallel)
    pub levels: Vec<Vec<String>>,
}

impl DependencyManager {
    /// Create a new dependency manager
    pub fn new() -> Self {
        Self {
            dependencies: HashMap::new(),
            dependents: HashMap::new(),
        }
    }

    /// Add a dependency relationship
    pub fn add_dependency(&mut self, contract: &str, dependency: &str) -> Result<(), ContractGeneratorError> {
        // Check for circular dependencies
        if self.has_circular_dependency(contract, dependency) {
            return Err(ContractGeneratorError::DependencyError(
                format!("Circular dependency detected: {} -> {}", contract, dependency)
            ));
        }

        // Add to dependencies graph
        self.dependencies
            .entry(contract.to_string())
            .or_insert_with(Vec::new)
            .push(dependency.to_string());
        
        // Add to dependents graph
        self.dependents
            .entry(dependency.to_string())
            .or_insert_with(Vec::new)
            .push(contract.to_string());
        
        Ok(())
    }

    /// Remove a dependency relationship
    pub fn remove_dependency(&mut self, contract: &str, dependency: &str) -> Result<(), ContractGeneratorError> {
        if let Some(deps) = self.dependencies.get_mut(contract) {
            deps.retain(|d| d != dependency);
            if deps.is_empty() {
                self.dependencies.remove(contract);
            }
        }

        if let Some(deps) = self.dependents.get_mut(dependency) {
            deps.retain(|d| d != contract);
            if deps.is_empty() {
                self.dependents.remove(dependency);
            }
        }

        Ok(())
    }

    /// Get direct dependencies of a contract
    pub fn get_dependencies(&self, contract: &str) -> Vec<String> {
        self.dependencies
            .get(contract)
            .cloned()
            .unwrap_or_default()
    }

    /// Get all dependencies (transitive) of a contract
    pub fn get_all_dependencies(&self, contract: &str) -> Vec<String> {
        let mut all_deps = Vec::new();
        let mut to_process = VecDeque::new();
        let mut processed = HashSet::new();

        to_process.push_back(contract.to_string());

        while let Some(current) = to_process.pop_front() {
            if processed.contains(&current) {
                continue;
            }
            processed.insert(current.clone());

            if let Some(deps) = self.dependencies.get(&current) {
                for dep in deps {
                    if !all_deps.contains(dep) && dep != contract {
                        all_deps.push(dep.clone());
                    }
                    to_process.push_back(dep.clone());
                }
            }
        }

        all_deps
    }

    /// Get contracts that depend on this contract
    pub fn get_dependents(&self, contract: &str) -> Vec<String> {
        self.dependents
            .get(contract)
            .cloned()
            .unwrap_or_default()
    }

    /// Get all dependents (transitive) of a contract
    pub fn get_all_dependents(&self, contract: &str) -> Vec<String> {
        let mut all_deps = Vec::new();
        let mut to_process = VecDeque::new();
        let mut processed = HashSet::new();

        to_process.push_back(contract.to_string());

        while let Some(current) = to_process.pop_front() {
            if processed.contains(&current) {
                continue;
            }
            processed.insert(current.clone());

            if let Some(deps) = self.dependents.get(&current) {
                for dep in deps {
                    if !all_deps.contains(dep) && dep != contract {
                        all_deps.push(dep.clone());
                    }
                    to_process.push_back(dep.clone());
                }
            }
        }

        all_deps
    }

    /// Check if there's a circular dependency
    fn has_circular_dependency(&self, contract: &str, new_dependency: &str) -> bool {
        if contract == new_dependency {
            return true;
        }

        let deps = self.get_all_dependencies(new_dependency);
        deps.contains(&contract.to_string())
    }

    /// Calculate deployment order using topological sort
    pub fn calculate_deployment_order(&self, contracts: &[String]) -> Result<DeploymentOrder, ContractGeneratorError> {
        let mut in_degree: HashMap<String, usize> = HashMap::new();
        let mut graph: HashMap<String, Vec<String>> = HashMap::new();

        // Initialize in-degree and graph for specified contracts
        for contract in contracts {
            in_degree.insert(contract.clone(), 0);
            graph.insert(contract.clone(), Vec::new());
        }

        // Build graph and calculate in-degrees
        for contract in contracts {
            if let Some(deps) = self.dependencies.get(contract) {
                for dep in deps {
                    if contracts.contains(dep) {
                        graph.entry(dep.clone())
                            .or_insert_with(Vec::new)
                            .push(contract.clone());
                        *in_degree.entry(contract.clone()).or_insert(0) += 1;
                    }
                }
            }
        }

        // Topological sort using Kahn's algorithm
        let mut queue: VecDeque<String> = in_degree
            .iter()
            .filter(|(_, &degree)| degree == 0)
            .map(|(contract, _)| contract.clone())
            .collect();

        let mut order = Vec::new();
        let mut levels = Vec::new();

        while !queue.is_empty() {
            let mut current_level = Vec::new();
            let level_size = queue.len();

            for _ in 0..level_size {
                if let Some(contract) = queue.pop_front() {
                    order.push(contract.clone());
                    current_level.push(contract.clone());

                    if let Some(dependents) = graph.get(&contract) {
                        for dependent in dependents {
                            if let Some(degree) = in_degree.get_mut(dependent) {
                                *degree -= 1;
                                if *degree == 0 {
                                    queue.push_back(dependent.clone());
                                }
                            }
                        }
                    }
                }
            }

            if !current_level.is_empty() {
                levels.push(current_level);
            }
        }

        // Check if all contracts were processed (no cycles)
        if order.len() != contracts.len() {
            return Err(ContractGeneratorError::DependencyError(
                "Circular dependency detected in contract set".to_string()
            ));
        }

        Ok(DeploymentOrder { order, levels })
    }

    /// Validate dependency graph for cycles
    pub fn validate(&self) -> Result<(), ContractGeneratorError> {
        let mut visited = HashSet::new();
        let mut rec_stack = HashSet::new();

        for contract in self.dependencies.keys() {
            if !visited.contains(contract) {
                if self.has_cycle_dfs(contract, &mut visited, &mut rec_stack) {
                    return Err(ContractGeneratorError::DependencyError(
                        format!("Circular dependency detected involving {}", contract)
                    ));
                }
            }
        }

        Ok(())
    }

    /// DFS helper for cycle detection
    fn has_cycle_dfs(
        &self,
        contract: &str,
        visited: &mut HashSet<String>,
        rec_stack: &mut HashSet<String>,
    ) -> bool {
        visited.insert(contract.to_string());
        rec_stack.insert(contract.to_string());

        if let Some(deps) = self.dependencies.get(contract) {
            for dep in deps {
                if !visited.contains(dep) {
                    if self.has_cycle_dfs(dep, visited, rec_stack) {
                        return true;
                    }
                } else if rec_stack.contains(dep) {
                    return true;
                }
            }
        }

        rec_stack.remove(contract);
        false
    }

    /// Get dependency statistics
    pub fn get_statistics(&self) -> DependencyStatistics {
        let total_contracts = self.dependencies.len().max(self.dependents.len());
        let total_dependencies: usize = self.dependencies.values().map(|v| v.len()).sum();
        
        let max_dependencies = self.dependencies.values()
            .map(|v| v.len())
            .max()
            .unwrap_or(0);
        
        let max_dependents = self.dependents.values()
            .map(|v| v.len())
            .max()
            .unwrap_or(0);

        DependencyStatistics {
            total_contracts,
            total_dependencies,
            max_dependencies,
            max_dependents,
        }
    }
}

/// Dependency statistics
#[derive(Debug, Clone)]
pub struct DependencyStatistics {
    pub total_contracts: usize,
    pub total_dependencies: usize,
    pub max_dependencies: usize,
    pub max_dependents: usize,
}

impl Default for DependencyManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add_dependency() {
        let mut manager = DependencyManager::new();
        
        assert!(manager.add_dependency("ContractA", "ContractB").is_ok());
        assert_eq!(manager.get_dependencies("ContractA"), vec!["ContractB"]);
        assert_eq!(manager.get_dependents("ContractB"), vec!["ContractA"]);
    }

    #[test]
    fn test_circular_dependency_detection() {
        let mut manager = DependencyManager::new();
        
        manager.add_dependency("ContractA", "ContractB").unwrap();
        manager.add_dependency("ContractB", "ContractC").unwrap();
        
        let result = manager.add_dependency("ContractC", "ContractA");
        assert!(result.is_err());
    }

    #[test]
    fn test_transitive_dependencies() {
        let mut manager = DependencyManager::new();
        
        manager.add_dependency("ContractA", "ContractB").unwrap();
        manager.add_dependency("ContractB", "ContractC").unwrap();
        manager.add_dependency("ContractC", "ContractD").unwrap();
        
        let deps = manager.get_all_dependencies("ContractA");
        assert_eq!(deps.len(), 3);
        assert!(deps.contains(&"ContractB".to_string()));
        assert!(deps.contains(&"ContractC".to_string()));
        assert!(deps.contains(&"ContractD".to_string()));
    }

    #[test]
    fn test_deployment_order() {
        let mut manager = DependencyManager::new();
        
        manager.add_dependency("ContractA", "ContractB").unwrap();
        manager.add_dependency("ContractA", "ContractC").unwrap();
        manager.add_dependency("ContractB", "ContractD").unwrap();
        manager.add_dependency("ContractC", "ContractD").unwrap();
        
        let contracts = vec![
            "ContractA".to_string(),
            "ContractB".to_string(),
            "ContractC".to_string(),
            "ContractD".to_string(),
        ];
        
        let order = manager.calculate_deployment_order(&contracts).unwrap();
        
        // ContractD should be first (no dependencies)
        assert_eq!(order.order[0], "ContractD");
        
        // ContractA should be last (depends on B and C)
        assert_eq!(order.order[3], "ContractA");
        
        // Should have 3 levels
        assert_eq!(order.levels.len(), 3);
    }

    #[test]
    fn test_validate_no_cycles() {
        let mut manager = DependencyManager::new();
        
        manager.add_dependency("ContractA", "ContractB").unwrap();
        manager.add_dependency("ContractB", "ContractC").unwrap();
        
        assert!(manager.validate().is_ok());
    }
}
