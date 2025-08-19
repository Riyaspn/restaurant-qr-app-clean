// components/SearchBar.js
export default function SearchBar({ onSearch, placeholder }) {
  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder={placeholder}
        onChange={(e) => onSearch(e.target.value)}
      />
      <style jsx>{`
        .search-bar {
          margin-bottom: 1rem;
        }
        input {
          width: 100%;
          max-width: 400px;
        }
      `}</style>
    </div>
  )
}
