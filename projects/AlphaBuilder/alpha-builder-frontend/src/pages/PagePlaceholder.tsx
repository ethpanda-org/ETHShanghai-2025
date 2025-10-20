type PagePlaceholderProps = {
  title: string;
  description?: string;
};

const PagePlaceholder = ({ title, description }: PagePlaceholderProps) => {
  return (
    <section className="container space-y-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="text-muted-foreground max-w-2xl text-base">
          {description}
        </p>
      ) : null}
    </section>
  );
};

export default PagePlaceholder;
