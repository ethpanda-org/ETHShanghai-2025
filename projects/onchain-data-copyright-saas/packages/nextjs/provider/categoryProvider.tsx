import { Dispatch, SetStateAction, createContext, useContext, useEffect, useState } from "react";

type CategoryItem = {
  label: string;
  href: string;
};

type CategoryProviderProps = {
  children: React.ReactNode;
};

type ICategoryState = {
  category: string;
  setCategory: Dispatch<SetStateAction<string>>;
  categories: Array<CategoryItem>;
  setCategories: Dispatch<SetStateAction<CategoryItem[]>>;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
};

export const CategoryContext = createContext<ICategoryState | null>(null);

export function useCategoryContext() {
  return useContext(CategoryContext) as ICategoryState;
}

export const CategoryProvider = ({ children }: CategoryProviderProps) => {
  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState<Array<CategoryItem>>([]);
  const [loading, setLoading] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      // 使用静态数据替代 API 调用
      const staticCategories: CategoryItem[] = [
        { label: "Handbook 手册", href: "/" },
        {
          label: "Cases 案例集",
          href: "https://github.com/NonceGeek/indiehacker-handbook/discussions/categories/cases-%E6%A1%88%E4%BE%8B%E9%9B%86",
        },
        { label: "Accelerator 修炼场", href: "https://github.com/NonceGeek/indiehacker-handbook/discussions/" },
        // { label: "HackerHouse 黑客小屋", href: "hackerhouse" }, // TODO
        { label: "Readings 其他资源", href: "readings" }, // TODO
        { label: "About 关于", href: "about" }, // TODO
      ];
      // const allCategory: CategoryItem = { label: "All 全部", href: "/" };
      // const categoriesArray = [allCategory, ...staticCategories];
      setCategories(staticCategories);
    } catch (error) {
      console.error("加载类别时出错:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <CategoryContext.Provider value={{ category, setCategory, categories, setCategories, loading, setLoading }}>
      {children}
    </CategoryContext.Provider>
  );
};
