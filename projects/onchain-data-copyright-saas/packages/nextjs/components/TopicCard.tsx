import clsx from "clsx";
import Link from "next/link";
import { useCategoryContext } from "~~/provider/categoryProvider";

const TopicCard = () => {
  const { categories, category, loading, setCategory } = useCategoryContext();

  const setCategoryHandler = (categoryLabel: string) => {
    setCategory(categoryLabel);
  };

  return (
    <>
      {loading ? (
        <div className="flex justify-center items-center">
          Loading<span className="loading loading-dots loading-xs"></span>
        </div>
      ) : (
        <ul className="menu [&_li>*]:rounded-lg space-y-2">
          {categories.map((item, index) => (
            <li key={index}>
              <Link
                href={item.href}
                className={clsx("text-lg", category === item.label && "bg-accent")}
                onClick={() => setCategoryHandler(item.label)}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

export default TopicCard;
