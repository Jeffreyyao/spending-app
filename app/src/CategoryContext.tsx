import React, { createContext, ReactNode, useContext, useState } from 'react';

interface Category {
  categoryId: number;
  name: string;
}

interface CategoryContextType {
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  refreshCategories: () => void;
  categoriesVersion: number;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const useCategoryContext = () => {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error('useCategoryContext must be used within a CategoryProvider');
  }
  return context;
};

interface CategoryProviderProps {
  children: ReactNode;
}

export const CategoryProvider: React.FC<CategoryProviderProps> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesVersion, setCategoriesVersion] = useState(0);

  const refreshCategories = () => {
    setCategoriesVersion(prev => prev + 1);
  };

  return (
    <CategoryContext.Provider value={{
      categories,
      setCategories,
      refreshCategories,
      categoriesVersion
    }}>
      {children}
    </CategoryContext.Provider>
  );
};
