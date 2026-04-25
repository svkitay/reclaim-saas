import { ProductResult } from '../types';
import ResultCard from './ResultCard';

interface Props {
  results: ProductResult[];
}

export default function ResultsGrid({ results }: Props) {
  return (
    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {results.map(result => (
        <ResultCard key={result.id} result={result} />
      ))}
    </div>
  );
}
